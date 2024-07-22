// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {VRFConsumerBaseV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

/**
 * @title RollSixWin - A decentralized betting game using Chainlink VRF for randomness
 * @author Tretoshi Sockamoto - June 18, 2024
 * @notice This contract allows players to bet on rolling a six-sided dice and win based on the outcome.
 * @dev This contract uses Chainlink VRF for generating random numbers to ensure fairness.
 */
contract RollSixWin is VRFConsumerBaseV2Plus {
    /// @notice Enum representing type of bet
    enum BetType { Number, Parity, Color }

    /// @notice Struct representing a single bet made by a player
    struct Bet {
        uint256 amount;
        BetType betType;
        uint8 guess;
    }

    /// @notice Struct representing statistics for a player
    struct PlayerStats {
        uint256 totalWageredAmount;
        int256 netProfit;
    }

    /// @notice Struct containing information about a player's betting history and balance
    struct PlayerInfo {
        PlayerStats stats;
        uint256 balance; 
        uint256 currentRound;
        uint8 flags;
    }

    /// @notice Chainlink's VRF Oracle information
    uint256 private _subscriptionId;
    address private vrfCoordinator =
        0xec0Ed46f36576541C75739E915ADbCb3DE24bD77;
    bytes32 private s_keyHash = 
        0x192234a5cda4cc07c0b66dfbcfbb785341cc790edc50032e842667dbb506cada;
    uint32 private callbackGasLimit = 2500000;
    uint16 private requestConfirmations = 3;
    uint32 private numWords = 50;

    /// @notice State related information including owner address, max bet, rakeFee.
    address private _owner;
    uint256 private maximumBet;
    uint256 private minimumBet;
    uint256 private feeBasisPoints;
    uint256 private minimumBetForStreaks;
    uint8[6] private colorMapping;
    bool private isStreaksActive;
    
    /// @notice Constants relating to the game
    uint256 private constant MAX_BASIS_POINTS = 10000;
    uint256 private constant ROUNDS_PER_FEE = 3;
    uint256 private constant MINIMUM_BALANCE_REQUIRED_FOR_BATCH_RELOAD = 3 ether;
    uint8 private constant ACCOUNT_STATUS = 16;
    uint8 private constant BAN_STATUS = 1;
    uint8 private constant BETS_STATUS = 2;
    uint8 private constant BATCH_STATUS = 8;
    int private constant TRANSFER_COOLDOWN_PERIOD = 3 minutes;

    /// @dev Mapping of player addresses to the PlayerInfo struct containing information regarding the player.
    mapping(address => PlayerInfo) private players;

    /// @dev Mapping of player addresses to a mapping of bet types to amount of eth bet on that type.
    mapping(address => mapping(uint8 => uint256)) private playerBets;

    /// @dev Mapping of player addresses to a mapping of bet types to the amount of wins a player has for that type. 
    mapping(address => mapping(uint8 => uint256)) private playerWins;

    /// @dev Mapping of player addresses to a uint represendting the blockstamp of the time a player has deposited.
    mapping(address => uint256) private timeSinceLastDeposit;

    /// @dev Mapping of player addresses to a uint represendting the blockstamp of the time a player has deposited.
    mapping(address => uint256) private timeSinceLastWithdraw;

    /// @dev Mapping of player addresses to the array of random numbers.
    mapping(address => uint256[]) private wordBank;

    /// @dev Mapping of request IDs to the addresses of players who initiated the roll.
    mapping(uint256 => address) private rollers;

     /// @dev Restricts access to only active players of the contract or the _
    modifier onlyActivePlayer() {
        bool banned = isBanned(players[msg.sender]);
        require(!banned, "Only active player can call this.");
        _;
    }

    /// @dev Restricts access to only the _ of the contract
    modifier ownerOnly() {
        require(msg.sender == _owner, "Only the owner can call this.");
        _;
    }

    /// @notice Creates a new DecentraDice contract
    /// @param subscriptionId The subscription ID for using Chainlink VRF
    constructor(uint256 subscriptionId) payable
        VRFConsumerBaseV2Plus(vrfCoordinator)
    {
        _subscriptionId = subscriptionId;
        _owner = msg.sender;
        feeBasisPoints = 500;
        maximumBet = 1 ether;
        minimumBet = 1e16;
        minimumBetForStreaks = minimumBet * 5;
        for (uint8 i = 0; i < 6; i++) {
            colorMapping[i] = i < 3 ? 1 : 2;
        }
    }  

    /// @notice Fallback function to recieve ETH, sends half of the amount to the owner
    receive() external payable {
        uint256 donationAmount = msg.value / 4;
        (bool s,) = _owner.call{value: donationAmount}("");
        require(s, "Transfer to owner failed.");

        emit DonationRecieved(donationAmount, block.timestamp);
    }

     /// @notice Allows a player to create an account, initializes first word batch (development will be 100 to 1,000 words)
    function createAccount() external {
        require(!isAccountCreated(players[msg.sender]),"You have already created an account.");
        players[msg.sender].currentRound++;
        activateAccount(players[msg.sender]);
        setRandomnessRequestStatus(players[msg.sender]);
        randomnessRequest();
    }

    /// @notice Allows a player to deposit matic into their balance
    function deposit() external payable onlyActivePlayer{
        require(block.timestamp >= timeSinceLastDeposit[msg.sender] + uint256(TRANSFER_COOLDOWN_PERIOD), "You may deposit once every three minutes.");
        require(isAccountCreated(players[msg.sender]),"You must create an account to deposit.");
        players[msg.sender].balance += msg.value;
        timeSinceLastDeposit[msg.sender] = block.timestamp;

        emit DepositComplete(msg.sender, msg.value, block.timestamp);
    }

    /// @notice Allows a player to withdraw their balance
    /// @param amount The amount to withdraw
    function withdraw(uint256 amount) external onlyActivePlayer {
        require(block.timestamp >= timeSinceLastWithdraw[msg.sender] + uint256(TRANSFER_COOLDOWN_PERIOD), "You may withdraw once every three minutes.");
        require(amount < address(this).balance, "Insufficient liquidity in contract to approve request.");
        require(amount <= players[msg.sender].balance, "Amount requested exceeds your balance.");

        timeSinceLastWithdraw[msg.sender] = block.timestamp;
        players[msg.sender].balance -= amount;

        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Withdraw failed");

        emit WithdrawComplete(msg.sender, amount, block.timestamp);
    }

    /// @notice Allows a player to place multiple bets
    /// @param bets An array of Bet structs detailing each bet
    function play(Bet[] calldata bets) external onlyActivePlayer {
        require(bets.length <= 10, "Cannot place more than ten bets in a single round.");
        PlayerInfo storage player = players[msg.sender];
        require(!randomnessRequested(player), "Please wait a few minutes while the dice machine refills..");
        require(!areBetsPlaced(player), "Bets have already been placed for this round.");
        
        setBetsStatus(player);

        uint256 totalAmount = 0;
        uint256 playerBalance = player.balance;
        uint256 currentRound = player.currentRound;
        uint256 betsLength = bets.length;

        for (uint i = 0; i < betsLength; i++) {
            Bet calldata bet = bets[i];
            uint256 betAmount = bet.amount;

            require(betAmount > minimumBet && betAmount <= maximumBet, "Bet amount must be greater than the mimimum bet and less than or equal to the maximum bet.");
            require(betAmount <= playerBalance, "Insufficient balance to place this bet");
            require(guessIsValid(bet.betType, bet.guess), "One or more bets have an invalid guessing range. Please check your bets and try again.");
            uint8 key = generateKey(bet.betType, bet.guess);
            playerBets[msg.sender][key] += betAmount;
            totalAmount += betAmount;
            playerBalance -= betAmount;

            emit BetPlaced(msg.sender, betAmount, bet.betType, bet.guess);
        }
        
        player.balance = playerBalance;
        uint8 diceResult = uint8((wordBank[msg.sender][(currentRound - 1) % numWords] % 6) + 1);
        processPlay(msg.sender, diceResult);
        player.currentRound++;
    }

    /// @notice Allows the owner to changed the number of words requested
    /// @param _numWords The new number of words to be requested
    function changeNumWords(uint32 _numWords) external ownerOnly {
        numWords = _numWords;

        emit NumberOfWordsChanged(_numWords, block.timestamp);
    }
    /// @notice Allows the owner to change the minumum bet required for streaks bonus
    /// @param _minimumBetForStreaks New bet minimum to activate and maintain streaks
    function changeMinimumBetForStreaksBonus( uint256 _minimumBetForStreaks) external ownerOnly {
         minimumBetForStreaks = _minimumBetForStreaks;

         emit MinimumBetForStreaksChanged(_minimumBetForStreaks, block.timestamp);
    }

    /// @notice Allows the owner to update the fee settings
    /// @param _feeBasisPoints Fee in basis points
    function changeFeeAmount(uint256 _feeBasisPoints) external ownerOnly {
        require(_feeBasisPoints >= 300 && _feeBasisPoints <= 1500 , "Fee must be in range of %3 and %15 (300 and 1500 basis points).");
        feeBasisPoints = _feeBasisPoints;

        emit FeeSettingsChanged(_feeBasisPoints, block.timestamp);
    }

    /// @notice Allow the owner to change the maximum bet
    /// @param _maximumBet The new maximum bet
    function changeMaximumBet(uint _maximumBet) external ownerOnly {
        require(_maximumBet > 1 ether, "New maximum must be greater than 1 ether and may not exceed 5% of the contract's balance.");
        maximumBet = _maximumBet;

        emit MaximumBetChanged(_maximumBet, block.timestamp);
    }


    /// @notice Allows the owner to change the minimum bet
    /// @param _minimumBet The new minimum bet 
    function changeMinimumBet(uint _minimumBet) external ownerOnly {
        require(_minimumBet > 0 && _minimumBet <= 1 ether, "New minimum must be greater than zero and may not exceed 1 ether.");
        minimumBet = _minimumBet;

        emit MinimumBetChanged(_minimumBet, block.timestamp);
    }

    /// @notice Toggles the bonus feature on or off
    function toggleStreaks() external ownerOnly {
        isStreaksActive = !isStreaksActive;
        
        emit StreaksStatusChanged(isStreaksActive, block.timestamp);
    }

    /// @notice Allows the owner to toggle the ban status of a player
    /// @param _player Address of the player to ban
    function toggleBanStatus(address _player) external ownerOnly {
        PlayerInfo storage player = players[_player];
        player.flags = player.flags ^ BAN_STATUS;
    }

    /// @notice Allows a player to request words if they don't have any
    function emergencyRequestWords() external onlyActivePlayer {
        require(wordBank[msg.sender].length == 0,"You already have words available.");
        if(wordBank[msg.sender].length == 0) {
            randomnessRequest();
        }
            emit EmergencyRandomnessRequest(msg.sender, block.timestamp);
    }

    /// @notice Allows the owner to withdraw all funds from the contract(development only)
    function eject() external ownerOnly {
        uint256 contractBalance = address(this).balance;
        require(contractBalance > 0, "No funds to withdraw");
        (bool success, ) = payable(_owner).call{value: contractBalance}("");
        require(success, "Withdraw failed");
        emit Ejected(block.timestamp);
    }


    /// @notice Retrieves player statistics
    /// @return All values related to the player statistics
    function getPlayerStatistics() 
        public 
        view  
        returns(
            uint256, 
            int256
        ) {
        PlayerStats storage stats = players[msg.sender].stats;
        return (
            stats.totalWageredAmount,
            stats.netProfit
        );
    }
    
    /// @notice Retrieves the last n winning numbers for a player
    /// @return limitedHistory An array containing the last n winning numbers
    function getWinningNumberHistory() public view returns (uint8[] memory) {
        uint256 currentRound = players[msg.sender].currentRound;
        require(currentRound > 1, "You must play at least one round to retrieve history.");
        uint256 historySize = (currentRound - 1) % numWords;
        uint8[] memory limitedHistory = new uint8[](historySize);
        for (uint256 i = 0; i < historySize; i++) {
            uint8 diceResult = uint8((wordBank[msg.sender][i] % 6) + 1);
            limitedHistory[i] = diceResult;
        }
        return limitedHistory;
    }

    /// @notice Gets color mapping for the current round
    function getColorMapping() public view returns (uint8[6] memory) {
        return colorMapping;
    }

    /// @notice Gets consecutive wins for each bet type
    /// @return consecutiveWins An array of uint256 representing the consecutive wins for each bet type
    function getConsecutiveWins() public view returns(uint256[] memory) {
        uint256[] memory consecutiveWins = new uint256[](3);
        for (uint8 i = 0; i < 3; i++) {
            consecutiveWins[i] = playerWins[msg.sender][i];
        }
        return consecutiveWins;
    }

    /// @notice Gets the balance of a player
    /// @return balance The balance of the player in Wei
    function getBalance() public view returns(uint256) {
        uint256 balance = players[msg.sender].balance;
        return balance;
    }

    /// @notice Gets the current round for the caller
    /// @return The current round number
    function getCurrentRound() public view returns(uint256) {
        return players[msg.sender].currentRound;
    }

    /// @notice Gets the maximum bet
    /// @return The maximum bet
    function getMaximumBet() public view returns(uint256) {
       return maximumBet;
    }

    /// @notice Gets the mimimum bet
    /// @return The mimimum bet
    function getMinimumBet() public view returns(uint256) {
        return minimumBet;
    }

    /// @notice Gets the status of streaks
    /// @return The status of streaks, 1 if active
    function getStreaksStatus() external view ownerOnly returns(bool) {
        return isStreaksActive;
    }
        /// @notice Checks if an account has been created for a player
    function getAccountStatus(address _player) external view onlyActivePlayer returns(bool) {
        PlayerInfo storage player = players[_player];
        return (player.flags & ACCOUNT_STATUS) != 0;
    }

    /// @notice Gets the ban status of a player
    /// @return Status of ban, 1 if banned
    function getBanStatus(address _player) external view onlyActivePlayer returns(bool) {
        PlayerInfo storage player = players[_player];
        return (player.flags & BAN_STATUS) != 0;
    }

    /// @dev Callback function used by VRF Coordinator
    /// @param requestId The ID of the VRF request
    /// @param randomWords Array of random words returned by VRF
    function fulfillRandomWords(
        uint256 requestId,
        uint256[] calldata randomWords
    ) 
        internal 
        override {
        address player = rollers[requestId];
        delete wordBank[player];
        wordBank[player] = randomWords;
        delete rollers[requestId];
        unsetRandomnessRequestStatus(players[player]);
    }

    /// @notice Processes all bets after placing them
    /// @param playersAddress The address of the player
    /// @param diceResult The result of the dice roll
    function processPlay(address  playersAddress, uint8 diceResult) private {
        PlayerInfo storage playerInfo = players[playersAddress];

        if (playerInfo.currentRound % numWords == 0){
            randomnessRequest();
            setRandomnessRequestStatus(playerInfo);
        }

        for (uint8 betType = 0; betType <= uint8(BetType.Color); betType++) {
            uint8 guessRange = (betType == uint8(BetType.Number)) ? 6 : 2;
            uint256 betCount = 0;
            uint256 totalBetAmount;
            for (uint8 guess = 1; guess <= guessRange; guess++) {
                uint8 key = generateKey(BetType(betType), guess);
                uint256  betAmount = playerBets[playersAddress][key];
                if (betAmount > 0) {
                    bool win = checkWin(BetType(betType), guess, diceResult);
                    uint256 payoutRatio = getPayoutRatio(BetType(betType), win);
                    uint256 winAmount = calculateWinAmount(betAmount, payoutRatio);
                    updatePlayersBalanceAndStatistics(playersAddress, winAmount, betAmount);
                    totalBetAmount += betAmount;
                    betCount++;
                    if (win && betCount == 1 && totalBetAmount >= minimumBetForStreaks) {
                        playerWins[playersAddress][betType]++;
                    } else {
                        playerWins[playersAddress][betType] = 0;
                    }
                    delete playerBets[playersAddress][key];
                    emit Result(playersAddress, BetType(betType), guess, diceResult, win, winAmount);
                }

            }
            if (betCount == 1) {
                applyBonus(playersAddress, BetType(betType), totalBetAmount);
            }

        }
        unsetBetsStatus(playerInfo);
        shiftColorMapping();
    }

    /// @notice Updates a player's balance and statistics
    function updatePlayersBalanceAndStatistics(
        address player, 
        uint256 winAmount, 
        uint256 betAmount
    ) 
        private {
        PlayerInfo storage playerInfo = players[player];
        PlayerStats storage stats = playerInfo.stats;

        playerInfo.balance += winAmount;
        stats.totalWageredAmount += betAmount;
        stats.netProfit += int256(winAmount) - int256(betAmount);

        if (playerInfo.currentRound % ROUNDS_PER_FEE == 0) {
            uint256 fee = (betAmount * feeBasisPoints) / MAX_BASIS_POINTS;
            if (playerInfo.balance >= fee) {
                playerInfo.balance -= fee;
                uint256 chainLinkRandomnessFee = fee / 2;
                players[_owner].balance += chainLinkRandomnessFee;

                emit FeeDistributed(fee, block.timestamp);
            } else {
                emit InsufficientBalanceForFeeTransfer(player, fee);
            }
        }
    }

    /// @notice Applies bonus to players bet when streaks is active
    /// @param player the address of the player
    /// @param betType the type of bet placed
    function applyBonus(
        address player, 
        BetType betType,
        uint256 totalBetAmount
    ) 
        private {
        uint256 bonus = 0;
        uint256 consecutiveWins = getConsecutiveWins(player, betType);
        
        uint16[5] memory standardBonuses = [10000, 20000, 30000, 40000, 50000];
        if (totalBetAmount >= minimumBetForStreaks) {
            if (betType == BetType.Number) {
                if (consecutiveWins >= 2 && consecutiveWins <= 5) {
                    bonus = totalBetAmount * standardBonuses[0] / MAX_BASIS_POINTS;
                } else if (consecutiveWins >= 6) {
                    bonus = totalBetAmount * standardBonuses[4] / MAX_BASIS_POINTS;
                } 
            } else {
                if (consecutiveWins >= 2 && consecutiveWins <= 3) {
                    bonus = totalBetAmount * standardBonuses[0] / MAX_BASIS_POINTS;
                } else if (consecutiveWins >= 4 && consecutiveWins <= 5) {
                     bonus = totalBetAmount * standardBonuses[1] / MAX_BASIS_POINTS;
                } else if (consecutiveWins >= 6 && consecutiveWins <= 7) {
                     bonus = totalBetAmount * standardBonuses[2] / MAX_BASIS_POINTS;
                } else if (consecutiveWins >= 8 && consecutiveWins <= 9) {
                     bonus = totalBetAmount * standardBonuses[3] / MAX_BASIS_POINTS;
                } else if (consecutiveWins >= 10) {
                     bonus = totalBetAmount * standardBonuses[4] / MAX_BASIS_POINTS;
                }
            }
        } else {
                playerWins[player][uint8(betType)] = 0;
        }
        if (bonus > 0) {
            players[player].balance += bonus;
            players[player].stats.netProfit += int(bonus); 
            emit BonusPaid(player, betType, bonus);
        } 
    }


    /// @notice Initiates a request to Chainlink VRF for randomness
    function randomnessRequest() private {
        PlayerInfo memory player = players[msg.sender];
        if (player.currentRound > 100) {
            require(player.balance >= MINIMUM_BALANCE_REQUIRED_FOR_BATCH_RELOAD,"Your balance is below the minimum required for betting (3 Matic).");
        }
        uint256 requestId = s_vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: s_keyHash,
                subId: _subscriptionId,
                requestConfirmations: requestConfirmations,
                callbackGasLimit: callbackGasLimit,
                numWords: numWords,
                extraArgs: VRFV2PlusClient._argsToBytes(
                    VRFV2PlusClient.ExtraArgsV1({nativePayment: false})
                )
            })
        );
        rollers[requestId] = msg.sender;
        emit RandomnessRequested(requestId, msg.sender);
    }
    /// @notice Shifts the colors around the board
    function shiftColorMapping() private {
        uint8 temp = colorMapping[5];
        for (uint8 i = 5; i > 0; i--) {
            colorMapping[i] = colorMapping[i - 1];
        }
        colorMapping[0] = temp;
    }

    /// @notice Sets the request status for a player when a reuquest for dice has been made
    function setRandomnessRequestStatus(PlayerInfo storage player) private {
        player.flags = player.flags | BATCH_STATUS;
    }

    /// @notice Unsets the request status for a player when a request for dice has been completed
    function unsetRandomnessRequestStatus(PlayerInfo storage player) private {
        player.flags = player.flags & (~BATCH_STATUS);
    }

    /// @notice Sets the bet status for a player when a bet has been made
    function setBetsStatus(PlayerInfo storage player) private {
        player.flags = player.flags | BETS_STATUS;
    }

    /// @notice Unsets the bet status for a player when a bet has been completed
    function unsetBetsStatus(PlayerInfo storage player) private {
        player.flags = player.flags & (~BETS_STATUS);
    }

    /// @notice Activates account for a player
    function activateAccount(PlayerInfo storage player) private {
        player.flags = player.flags | ACCOUNT_STATUS;
    } 
    /// @notice Validates the guess based on the bet type
    /// @param betType The type of bet
    /// @param guess The number 
    /// @return True if the guess is valid for the bet type, false otherwise
    function guessIsValid(BetType betType, uint8 guess) private pure returns (bool) {
        if (betType == BetType.Number) {
            return guess >= 1 && guess <= 6;
        } else if (betType == BetType.Parity) {
            return guess == 1 || guess == 2;
        } else if (betType == BetType.Color) {
            return guess == 1 || guess == 2;
        }

        return false;
    }

    /// @notice Generates a unique key for storing bet amounts in a mapping
    /// @param betType The type of bet
    /// @param guess The guess of the bet
    /// @return A unique key for the bet
    function generateKey(
        BetType betType, 
        uint8 guess
    ) 
        private 
        pure 
        returns (uint8) {
        return uint8(betType) * 10 + guess;
    }

    /// @notice Checks if the player's bet wins based on the dice result
    /// @param betType The type of bet
    /// @param guess The guess value
    /// @param diceResult The result of the dice roll
    /// @return True if the bet wins, false otherwise
    function checkWin(
        BetType betType, 
        uint8 guess, 
        uint8 diceResult
    ) 
        private 
        view 
        returns (bool) {
        if (betType == BetType.Number) {
            return diceResult == guess;
        } else if (betType == BetType.Parity) {
            return (guess == 1 && diceResult % 2 != 0) || (guess == 2 && diceResult % 2 == 0);
        } else if (betType == BetType.Color) {
            uint8 color = colorMapping[diceResult - 1];
            return guess == color;
        }

        return false;
    }

    /// @notice Calculates the payout ratio based on the bet type and whether it's a winning bet
    /// @param betType The type of bet
    /// @param win Whether the bet was a win
    /// @return payoutRatio The payout multiplier for the bet
    function getPayoutRatio(
        BetType betType, 
        bool win
    ) 
        private 
        pure 
        returns (uint256) {
        if (!win) 
            return 0;

        if (betType == BetType.Number) 
            return 6; 
            else 
            return 2; 

    }

    /// @notice Calculates the amount won based on the bet amount and payout ratio
    /// @param betAmount The amount of the bet
    /// @param payoutRatio The payout ratio
    /// @return The total payout amount
    function calculateWinAmount(
        uint256 betAmount, 
        uint256 payoutRatio
    ) 
        private 
        pure 
        returns (uint256) {
        uint256 totalPayout = betAmount * payoutRatio;
        return totalPayout;
    }

    /// @notice Retrieves the current consecutive win for the player
    /// @param player Address of the player
    /// @param betType Type of bet that was placed
    function getConsecutiveWins(
        address player, 
        BetType betType
    ) 
        private 
        view 
        returns(uint256) {
        return playerWins[player][uint8(betType)];
    }

    /// @notice Flips a flag when words are requested
    function randomnessRequested(PlayerInfo storage player) private view returns(bool) {
        return (player.flags & BATCH_STATUS) != 0;
    }
    
    /// @notice Checks if a player is banned
    function isBanned(PlayerInfo storage player) private view returns(bool) {
        return (player.flags & BAN_STATUS) != 0;
    }

    /// @notice Checks if bets are placed for a player
    function areBetsPlaced(PlayerInfo storage player) private view returns(bool) {
        return (player.flags & BETS_STATUS) != 0;
    }

    /// @notice Checks if an account has been created for a player
    function isAccountCreated(PlayerInfo storage player) private view returns(bool) {
        return (player.flags & ACCOUNT_STATUS) != 0;
    }


    /// @dev Emitted when a player places a bet
    event BetPlaced(
        address indexed player, 
        uint256 betAmount, 
        BetType betType, 
        uint8 guess
    );

    /// @dev Emitted when the result of a bet is determined
    event Result(
        address indexed player, 
        BetType betType, 
        uint8 guess, 
        uint8 winningNumber, 
        bool winner, 
        uint256 amountWon
    );

    /// @dev Emitted when a deposit is made
    event DepositComplete(
        address indexed player, 
        uint256 amount,
        uint256 timestamp
    );

    /// @dev Emitted when a player withdraws their balance
    event WithdrawComplete(
        address indexed player, 
        uint256 amount,
        uint256 timestamp
    );

    /// @dev Emitted when a request to Chainlink has been made
    event RandomnessRequested(
        uint256 indexed requestId, 
        address indexed player
    );

    /// @dev Emmited when rewards are distributed to players
    event BonusPaid(
        address player, 
        BetType betType, 
        uint256 amount
    );

    /// @dev Emitted when fee is applied
    event FeeDistributed(
        uint256 amount, 
        uint256 timestamp
    );

    /// @dev Emitted when the balance of the player is lower than the fee for the bet
    event InsufficientBalanceForFeeTransfer(
        address player, 
        uint256 fee
    );

     /// @dev Emitted when consecutive multiplier is toggled on or off
    event StreaksStatusChanged(
        bool isActive,
        uint256 timestamp
    );

    /// @dev Emitted when the fee settting amount is changed
    event FeeSettingsChanged(
        uint256 newFeeBasisPoints,
        uint256 timestamp
    );

    /// @dev Emitted when the maximum bet is changed
    event MaximumBetChanged(
        uint256 newMaximum, 
        uint256 timestamp
    );

    /// @dev Emitted when the minimum bet is changed
    event MinimumBetChanged(
        uint256 newMinimum, 
        uint256 timestamp
    );

    /// @dev Emitted when the number of words requested has changed
    event NumberOfWordsChanged(
        uint32 newWordAmount,
        uint256 timestamp
    );

    /// @dev Emitted when emergency request for randomness is made
    event EmergencyRandomnessRequest(
        address player,
        uint256 timestamp
    );

    /// @dev Emitted when ejection has occured(development only)
    event Ejected(
        uint256 timestamp
    );

    /// @dev Emitted when a donation is received
    event DonationRecieved(
        uint256 amount,
        uint256 timestamp
    );
    
    /// @dev Emitted when streaks bet amount changes
    event MinimumBetForStreaksChanged(
        uint256 newBetMinumum,
        uint256 timestamp
    );
}
