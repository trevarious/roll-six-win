/*
TODO 07/17/24: 
- Chip update when bet takes place, top when lose chips, bottom when uou iwn chips 
- Top off chips when a bet take place, keep the chips ouu win and idscard the chips you lse 
*/
import { contractABI } from './abi.js';
import { contractAddress } from './address.js';
let calculateTotalBetAmount = () => {
  return bets.reduce((total, bet) => total.add(web3.utils.toBN(bet.amount)), web3.utils.toBN('0'));
};
let web3;
let contract;
let userAccount
let board;
let bets;
let lastRoundsBets = [];
let polygonImage = document.createElement('img');
polygonImage.src = '/assets/polygon.chip.webp';
polygonImage.width = 18;
polygonImage.height = 18;
polygonImage.setAttribute('draggable', false);
polygonImage.style.userSelect = 'none';

const createAccountButton = document.getElementById("account-button");
const depositButton = document.getElementById("deposit-button");
const withdrawButton = document.getElementById("withdraw-button");
const connectWalletButton = document.getElementById("connect-wallet-button");
const playButton = document.getElementById("place-bet-button");
const rollIndicator = document.getElementById("roll-indicator")
const totalBetAmount = document.getElementById("totalBetAmount");
const balance = document.getElementById("balance");
const round = document.getElementById("round");
const numberedBoards = document.querySelectorAll(".numbered-board");
const replayButton = document.getElementById('replay-bet-button');

document.addEventListener('DOMContentLoaded', () => {
  playButton.classList.add("hidden");
});

const initialize = async () => {
  if (window.ethereum) {
    // let response = prompt("Would you like to sign in with MetaMask?");
    let response = 'y';
    const yesRegex = /^y[a-z]*$/i;
    const noRegex = /^n[a-z]*$/i;
    if (yesRegex.test(response.trim())) {
      try {
        web3 = new Web3(window.ethereum);
        contract = new web3.eth.Contract(contractABI, contractAddress);
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        console.log(`Account one : ${accounts[0]}`);
        userAccount = accounts[0];
        connectWalletButton.disabled = true;
        const timestamp = new Date().toLocaleString();
        console.log(`Log in successful at ${timestamp}`);
        const accountConnectionIndicator = document.getElementById("log-status-indicator");
        accountConnectionIndicator.classList.add("logged-in");
        rollIndicator.classList.add("logged-in");
        rollIndicator.textContent = "Welcome";
        replayButton.classList.add('bets-on');
        setTimeout(() => {
          rollIndicator.classList.remove("logged-in");
          rollIndicator.textContent = "";
        }, 3000);
        updateAccountDisplay(userAccount);
        let calculateTotalBetAmount = () => {
          return bets ? bets.reduce((total, bet) => total.add(web3.utils.toBN(bet.amount)), web3.utils.toBN('0')) : '';
        };
        let totalBetAmount = calculateTotalBetAmount();
        updateBetDisplay(totalBetAmount);
        updateColorMapping();
        updateConsecutiveWins();
        // displayWinningNumberHisory();
        board = new Board();
        bets = board.bets;
        board.dealChips();
      } catch (error) {
        console.log(error);
        alert("There was an error connecting wallet");
      }
    } else if (noRegex.test(response.trim())) {
      console.log("User declined sign-in with MetaMask.");
      alert("User declined sign-in with MetaMask.");
    } else {
      console.log("Invalid response. Please enter 'y' or 'n'.");
      alert("Invalid response. Please enter 'y' or 'n'.");
    }
  } else {
    console.log("Failed to make request");
    alert("Failed to make request");
  }
  playButton.classList.add("hidden");
};
connectWalletButton.addEventListener("click", initialize);

const accountAddress = document.getElementById("wallet-address");
const updateAccountDisplay = async (account) => {
  console.log(`update account display called, value of userAccount: ${userAccount}`);
  try {
    const isAccountCreated = await contract.methods.getAccountStatus(account).call({ from: userAccount });
    console.log(`Is account created: ${isAccountCreated}`);
    if (isAccountCreated) {
      const balanceValue = await contract.methods.getBalance().call({ from: account });
      const balanceInMatic = web3.utils.fromWei(balanceValue);
      const roundValue = await contract.methods.getCurrentRound().call({ from: account });
      depositButton.classList.add("active");
      withdrawButton.classList.add("active");
      createAccountButton.style.display = "none";
      connectWalletButton.style.display = "none";
      let sliceAmount = balanceInMatic > 0 && balanceInMatic < 10 ? 4 : balanceInMatic < 100 ? 5 : balanceInMatic < 1000 ? 6 : balanceInMatic < 10000 ? 7 : 0;
      balance.textContent = balanceInMatic.slice(0, sliceAmount);
      balance.appendChild(polygonImage);
      if (balanceInMatic < 1) {
        depositButton.classList.add('broke');
      }
      round.textContent = roundValue;
      accountAddress.innerHTML = `<p>Connected!</p>`;
      setTimeout(() => {
        accountAddress.innerHTML = `<p>0x...${userAccount.slice(-5)}</p>`;
      }, 1500);
      console.log("Welcome back!");
    } else {
      createAccountButton.disabled = false;
      createAccountButton.classList.add('active');
      connectWalletButton.classList.add('hidden');
      console.log("Please create an account to play!");
    }
  } catch (error) {
    console.log(error);
  }
}

const accountContainer = document.getElementById('wallet-status-container');
accountContainer.addEventListener("mouseenter", () => {
  if (userAccount) {
    accountAddress.innerHTML = `<p>${userAccount}</p>`;
  }
});
accountContainer.addEventListener("mouseleave", () => {
  if (userAccount) {
    accountAddress.innerHTML = `<p>0x...${userAccount.slice(-5)}</p>`;
  }
});

const fetchBalance = async () => {
  try {
    const balanceValue = await contract.methods.getBalance().call({ from: userAccount });
    const balanceValueInMatic = web3.utils.fromWei(balanceValue);
    return parseFloat(balanceValueInMatic);
  } catch (error) {
    console.error("Error updating balance:", error);
    return null;
  }
};

const fetchRoundNumber = async () => {
  try {
    const roundNumber = await contract.methods.getCurrentRound().call({ from: userAccount });
    return roundNumber;
  } catch (error) {
    console.error("Error updating Round number:", error);
    return null;
  }
};

const updateBetDisplay = async (totalBetAmount) => {
  if (totalBetAmount == 0)
    document.getElementById('place-bet-button').classList.remove('active');
  try {
    let currentBalance = await fetchBalance();
    let roundNumber = await fetchRoundNumber();
    if (roundNumber !== parseInt(round.textContent)) {
      round.textContent = roundNumber;
    }
    let betAmountInMatic = web3.utils.fromWei(totalBetAmount.toString());
    if (currentBalance !== null) {
      let remainingBalance = currentBalance - betAmountInMatic;
      console.log(remainingBalance);
      const balanceElement = document.getElementById('balance');
      if (parseFloat(balanceElement.textContent) !== remainingBalance) {
        balanceElement.textContent = remainingBalance.toFixed(2);
        balanceElement.appendChild(polygonImage);
      }
      const totalBetElement = document.getElementById('totalBetAmount');
      if (totalBetElement) {
        totalBetElement.classList.add('hidden2');
        setTimeout(() => {
          let stringValue = web3.utils.fromWei(totalBetAmount.toString(), 'ether');
          let splicedValue = stringValue.slice(1);
          if (stringValue == 0) {
            totalBetElement.textContent = `${stringValue}`
          } else if (stringValue >= 0 && stringValue < 1) {
            totalBetElement.textContent = `${splicedValue}`;
          } else if (stringValue >= 1) {
            totalBetElement.textContent = `${stringValue}`;
          }
          totalBetElement.classList.remove('hidden2');
        }, 150);
      }
      decreaseAnimation();
    } else {
      console.error("Failed to fetch current balance.");
    }
  } catch (error) {
    console.error("Error displaying total bet amount:", error);
  }
};

const fetchColorMapping = async () => {
  try {
    const result = await contract.methods.getColorMapping().call();
    return result;
  } catch (error) {
    console.error("Error fetching color mapping:", error);
    return null;
  }
}
const updateColorMapping = async () => {
  const colorMapping = await fetchColorMapping();
  if (!colorMapping) {
    console.log("Error: Failed to fetch color mapping from contract");
    return;
  }
  let colors = { red: 0, black: 0 };
  numberedBoards.forEach((board, index) => {
    const color = colorMapping[index] == 1 ? 'red' : 'black';
    board.classList.remove('red', 'black');
    board.classList.add('waiting');
    setTimeout(() => {
      board.classList.remove('waiting');
      board.classList.add(color);
      colors[color]++;
    }, 1000)
  });
}

const fetchConsecutiveWins = async () => {
  try {
    const result = await contract.methods.getConsecutiveWins().call({ from: userAccount });
    return result;
  } catch (error) {
    console.error('Error fetching consecutive wins:', error);
  }
}
const updateConsecutiveWins = async () => {
  try {
    const result = await contract.methods.getConsecutiveWins().call({ from: userAccount });
    console.log("updateConsecutiveWins:  " + result);
    updateBoardMultiplier('.number-streaks', result[0]);
    updateBoardMultiplier('.parity-streaks', result[1]);
    updateBoardMultiplier('.color-streaks', result[2]);
  } catch (error) {
    console.error('Error fetching consecutive wins:', error);
  }

}
const updateBoardMultiplier = (elementclass, multipliedAmount) => {
  const elementToModify = document.querySelectorAll(elementclass);
  elementToModify.forEach(element => {
    element.classList.remove('active-light');
    element.textContent = '';
  });
  elementToModify.forEach(element => {
    let amountToLight = multipliedAmount > 0 ? multipliedAmount - 1 : multipliedAmount - 1;
    let anotherLight = multipliedAmount > 0 ? multipliedAmount - 1 : multipliedAmount - 1;
    const lightContainer = document.createElement('div');
    lightContainer.classList.add('light-container');
    if (elementclass == '.parity-streaks' || elementclass == '.color-streaks') {
      for (let i = 0; i < 10; i++) {
        const light = document.createElement('div');
        light.classList.add('light');
        if (amountToLight > 0) {
          light.classList.add('active-light');
          amountToLight--;
        }
        if (anotherLight > -1) {
          anotherLight--;
          if (!light.classList.contains('active-light')) {
            light.classList.add('scale');
          }
        }
        lightContainer.appendChild(light);
      }
      if (element.id == 'red-board') {
        lightContainer.style.alignItems = 'flex-end';
        if (window.innerWidth > 600)
          lightContainer.style.left = '-5px';
      }
      if (element.id == 'odd-board') {
        lightContainer.style.alignItems = 'flex-end';
        if (window.innerWidth > 600)
          lightContainer.style.left = '-5px';
      }
      element.appendChild(lightContainer);
    }
  })
}
const deposit = async () => {
  try {
    const amount = prompt("Please enter an amount in MATIC");
    if (amount && !isNaN(amount) && parseFloat(amount) > 0) {
      const amountInWei = web3.utils.toWei(amount, "ether");
      const receipt = await contract.methods.deposit().send({ from: userAccount, value: amountInWei });
      console.log("Successfully deposited " + amount + " MATIC");
      alert("Successfully deposited " + amount + " MATIC");
      updateStats(); // Update stats and regenerate chips
      receipt.events.DepositComplete ?
        console.log("Event: ", receipt.events.DepositComplete.returnValues) :
        console.log("Event not found in receipt");
    } else {
      console.log("Please enter a valid amount");
      alert("Please enter a valid amount");
    }
  } catch (error) {
    console.log("Could not make deposit request: " + error);
    alert("Could not make deposit request: " + error);
  }
};
depositButton.addEventListener("click", deposit);

const withdraw = async () => {
  try {
    const amount = prompt("Please enter an amount in MATIC");
    if (amount && !isNaN(amount) && parseFloat(amount) > 0) {
      const amountInWei = web3.utils.toWei(amount, "ether");
      const receipt = await contract.methods.eject().send({ from: userAccount });
      console.log(`Withdraw complete for : ${amount} MATIC ` + receipt);
    } else {
      console.log(`Please enter a valid amount. Amount entered: ${amount}`);
      alert(`Please enter a valid amount. Amount entered: ${amount}`);
    }
  } catch (error) {
    console.log(`There was an error processing your withdraw: ${error}`);
  }
}
withdrawButton.addEventListener("click", withdraw);

const createAccount = async () => {
  try {
    await contract.methods.createAccount().send({ from: userAccount });
    console.log("Account created successfully.");
    updateStats();
  } catch (error) {
    console.log("Error creating your account. " + error);
  }
};
createAccountButton.addEventListener("click", createAccount);

const play = async () => {
  lastRoundsBets.length = 0;
  lastRoundsBets = [...bets];
  let winningNumberForRound = null;
  playButton.classList.add('clicked');
  setTimeout(() => {
    playButton.classList.remove('clicked');
  }, 100)
  setTimeout(() => {
    playButton.classList.remove("active");
  }, 300)
  document.body.classList.add('disable-document');
  rollIndicator.classList.add('rolling');
  try {
    let totalBetAmounts = calculateTotalBetAmount();
    let totalProfitForRound = 0;
    let netProfitForRound = 0;
    let bonuses = 0;
    console.log("Total bet amounts " + totalBetAmounts);
    if (!web3 || !userAccount || !contract) {
      throw new Error("Web3, user account, or contract not initialized.");
    }
    if (bets.length === 0) {
      throw new Error("No bets to place.");
    }
    console.log("Sending bet transaction...");
    const receipt = await contract.methods.play(bets).send({ from: userAccount });
    console.log("Bets placed successfully");
    console.log(receipt);
    // Making the dice active
    const canvasElements = document.querySelector('.dice-canvas');
    canvasElements.classList.add('active');
    // random position for the dice to slide to
    var randomNumber = Math.floor(Math.random() * (450 - (-450) + 1)) + (-450);
    canvasElements.style.right = `${randomNumber}px`;
    if (receipt.events && receipt.events.Result) {
      if (receipt.events.BonusPaid) {
        if (Array.isArray(receipt.events.BonusPaid)) {
          for (let i = 0; i < receipt.events.BonusPaid.length; i++) {
            bonuses += parseFloat(web3.utils.fromWei(receipt.events.BonusPaid[i].returnValues[2]));
          }
          console.log(`Bonus paid: ${bonuses} matic`);
        } else {
          bonuses += parseFloat(web3.utils.fromWei(receipt.events.BonusPaid.returnValues[2]));
          console.log(`Bonus paid: ${bonuses} matics`);
        }
      } else {
        console.log('no bonuses active');
      }
      // Roll the carousel to the winning number
      rollIndicator.classList.remove('rolling');
      rollIndicator.classList.add('active');
      if (Array.isArray(receipt.events.Result)) {
        let intervalId = setInterval(() => {
          // Roll the dice to the winning number
          rollDiceToNumber(parseInt(receipt.events.Result[0].returnValues[3]));
        }, 1000);
        setTimeout(() => {
          clearInterval(intervalId);
        }, 1000);

        setTimeout(() => {
          let target = rollAnimation(receipt.events.Result[0].returnValues[3]);
          unRollAnimation(target);
        }, 300)
        receipt.events.Result.forEach((event) => {
          const returns = event.returnValues;
          winningNumberForRound = returns[3];
          console.log(`Winning number: ${returns[3]}`);
          totalProfitForRound += parseFloat(web3.utils.fromWei(returns[5]));
          if (receipt.events.FeeDistributed && Array.isArray(receipt.events.FeeDistributed)) {
            const feeEvent = receipt.events.FeeDistributed.find((feeEvent) => feeEvent.blockNumber === event.blockNumber);
            if (feeEvent) {
              const feeReturns = feeEvent.returnValues;
              const unixTimestamp = parseInt(feeReturns[1]) * 1000;
              const date = new Date(unixTimestamp);
              const formattedDate = date.toLocaleString();
              const amountInMatic = web3.utils.fromWei(feeReturns[0]);
              console.log(`Fee distributed at ${formattedDate} for amount of ${amountInMatic} MATIC`);
            }
          }
        });
      } else {
        const returns = receipt.events.Result.returnValues;
        winningNumberForRound - returns[3];
        console.log(`Winning number: ${returns[3]}`);
        let intervalId = setInterval(() => {
          rollDiceToNumber(parseInt(returns[3]));
        }, 1000);
        setTimeout(() => {
          clearInterval(intervalId);
        }, 1000);
        setTimeout(() => {
          let target = rollAnimation(returns[3]);
          unRollAnimation(target);
        }, 500)
        totalProfitForRound += parseFloat(web3.utils.fromWei(returns[5]));
        if (receipt.events.FeeDistributed && Array.isArray(receipt.events.FeeDistributed)) {
          const feeEvent = receipt.events.FeeDistributed.find((feeEvent) => feeEvent.blockNumber === receipt.events.Result.blockNumber);
          if (feeEvent) {
            const feeReturns = feeEvent.returnValues;
            const unixTimestamp = parseInt(feeReturns[1]) * 1000;
            const date = new Date(unixTimestamp);
            const formattedDate = date.toLocaleString();
            const amountInMatic = web3.utils.fromWei(feeReturns[0]);
            console.log(`Fee applied on ${formattedDate} for an amount of ${amountInMatic} MATIC.`);
          }
        }
      }
      let totalBetAmountsInMatic = parseFloat(web3.utils.fromWei(totalBetAmounts.toString()));
      totalProfitForRound += bonuses;
      if (totalBetAmountsInMatic > totalProfitForRound) {
        netProfitForRound = totalBetAmountsInMatic - totalProfitForRound;
        setTimeout(() => {
          lossAnimation(netProfitForRound, winningNumberForRound);
        }, 5500);
      } else if (totalBetAmountsInMatic < totalProfitForRound) {
        netProfitForRound = totalProfitForRound - totalBetAmountsInMatic;
        setTimeout(() => {
          winAnimation(netProfitForRound, winningNumberForRound);
        }, 5500);
      } else {
        setTimeout(() => {
          breakEvenAnimation(winningNumberForRound);
        }, 5500);
      }
    } else {
      console.log("No Result event found in the receipt.");
      throw new Error("No Result event found in the receipt.");
    }
    setTimeout(() => {
      updateBetDisplay(0);
      updateColorMapping();
      clearChips();
    }, 12000);
    setTimeout(() => {
      document.body.classList.remove('disable-document');
      canvasElements.classList.remove('active');
      canvasElements.style.right = ``;
      replayButton.classList.remove('bets-on');
      setTimeout(() => { resetScene(); }, 850);
    }, 14500);
    setTimeout(() => {
      updateConsecutiveWins();
      bets.length = 0;
    }, 14800);
  } catch (error) {
    console.error("Error placing bets:", error);
    alert("Error placing bets: " + error.message);
    rollIndicator.classList.remove('rolling');
    document.body.classList.remove('disable-document');
    const boards = document.querySelectorAll('.betting-board');
    boards.forEach(board => {
      const chips = board.querySelectorAll('.placed');
      chips.forEach(chip => chip.remove());
    });
    bets.length = 0;
    let updatedTotalBetAmount = calculateTotalBetAmount();
    let updatedTotalBetAmountInMatic = parseFloat(web3.utils.fromWei(updatedTotalBetAmount.toString()));
    updateBetDisplay(updatedTotalBetAmountInMatic);
    clearChips();
    replayButton.classList.remove('bets-on');
    playButton.classList.remove("active");
  }
};
playButton.addEventListener("click", play);
const updateStats = async () => {
  try {
    const balanceValue = await contract.methods.getBalance().call({ from: userAccount });
    const balanceInMatic = web3.utils.fromWei(balanceValue);
    const roundValue = await contract.methods.getCurrentRound().call({ from: userAccount });
    let sliceAmount = balanceInMatic > 0 && balanceInMatic < 10 ? 4 : balanceInMatic < 100 ? 5 : balanceInMatic < 1000 ? 6 : balanceInMatic < 10000 ? 7 : 0;
    balance.textContent = balanceInMatic;
    balance.appendChild(polygonImage);
    if (balanceInMatic < 1) {
      depositButton.classList.add('broke');
    } else {
      depositButton.classList.remove('broke');
    }
    round.textContent = roundValue;
  } catch (error) {
    console.log("error updating stats " + error);
  }
};
const distributeWinningChips = async (winningNumber) => {
  const consecutiveWins = await fetchConsecutiveWins();
  let multipliedAmountForNumber = consecutiveWins[0] == 3 ? 0.1 : consecutiveWins[0] == 4 || consecutiveWins[0] == 5 ? 0.5 : consecutiveWins[0] >= 6 ? 1 : '';
  let multipliedAmountForParity = consecutiveWins[1] == 1 ? 1 : consecutiveWins[1] == 2 ? 1.5 : consecutiveWins[1] == 3 ? 2 : consecutiveWins[1] == 4 ? 2.5 : consecutiveWins[1] == 5 ? 3 : consecutiveWins[1] == 6 ? 4 : consecutiveWins[1] == 7 ? 5 : consecutiveWins[1] == 8 ? 6 : '';
  let multipliedAmountForColor = consecutiveWins[2] == 1 ? 1 : consecutiveWins[2] == 2 ? 1.5 : consecutiveWins[2] == 3 ? 2 : consecutiveWins[2] == 4 ? 2.5 : consecutiveWins[2] == 5 ? 3 : consecutiveWins[2] == 6 ? 4 : consecutiveWins[2] == 7 ? 5 : consecutiveWins[2] == 8 ? 6 : '';
  let winningChipClone = null;
  const bettingBoard = document.querySelectorAll('.betting-board');
  document.querySelectorAll('.numbered-board').forEach(board => {
    if (board.getAttribute('data-value') === winningNumber) {
      setTimeout(() => {
        const chipsOnBoard = board.querySelectorAll('.chip');
        chipsOnBoard.forEach(chip => {
          let value = chip.getAttribute('data-value');
          console.log("attribute of chip: " + chip.getAttribute('data-value'));
          for (let i = 0; i < 5; i++) {
            if (multipliedAmountForNumber > 3) {
              for (let i = 0; i < multipliedAmountForNumber; i++) {
                winningChipClone = new Chip(value);
                placeChipOnBoard(winningChipClone.element, board);
              }
            } else {
              winningChipClone = new Chip(value);
              winningChipClone.element.style.boxShadow = '15px 15px 60px yellow';
              winningChipClone.element.style.zIndex = '10000000';
              placeChipOnBoard(winningChipClone.element, board);
            }
          }
        })
      }, 1);
      if (board.classList.contains('red')) {
        bettingBoard[9].classList.add('winning-board');
        setTimeout(() => {
          const chipsOnBoard = bettingBoard[9].querySelectorAll('.placed');
          chipsOnBoard.forEach(chip => {
            if (multipliedAmountForColor > 0) {
              for (let i = 0; i < multipliedAmountForColor; i++) {
                console.log("attribute of chip: " + chip.getAttribute('data-value'));
                let value = chip.getAttribute('data-value');
                winningChipClone = new Chip(value);
                winningChipClone.element.style.boxShadow = '15px 15px 60px yellow';
                winningChipClone.element.style.zIndex = '10000000';
                placeChipOnBoard(winningChipClone.element, bettingBoard[9]);
              }
            } else {
              console.log("attribute of chip: " + chip.getAttribute('data-value'));
              let value = chip.getAttribute('data-value');
              winningChipClone = new Chip(value);
              winningChipClone.element.style.boxShadow = '15px 15px 60px yellow';
              winningChipClone.element.style.zIndex = '10000000';
              placeChipOnBoard(winningChipClone.element, bettingBoard[9]);
            }
          })



        }, 1);
      } else if (board.classList.contains('black')) {
        bettingBoard[8].classList.add('winning-board');
        const chipsOnBoard = bettingBoard[8].querySelectorAll('.placed');
        setTimeout(() => {
          chipsOnBoard.forEach(chip => {
            if (multipliedAmountForColor > 0) {
              for (let i = 0; i < multipliedAmountForColor; i++) {
                console.log("attribute of chip: " + chip.getAttribute('data-value'));
                let value = chip.getAttribute('data-value');
                winningChipClone = new Chip(value);
                winningChipClone.element.style.boxShadow = '15px 15px 60px yellow';
                winningChipClone.element.style.zIndex = '10000000';
                placeChipOnBoard(winningChipClone.element, bettingBoard[8]);
              }
            } else {
              console.log("attribute of chip: " + chip.getAttribute('data-value'));
              let value = chip.getAttribute('data-value');
              winningChipClone = new Chip(value);
              winningChipClone.element.style.boxShadow = '15px 15px 60px yellow';
              winningChipClone.element.style.zIndex = '10000000';
              placeChipOnBoard(winningChipClone.element, bettingBoard[8]);
            }
          })

        }, 1);
      }
      if (winningNumber % 2 == 0) {
        bettingBoard[0].classList.add('winning-board');
        setTimeout(() => {
          const chipsOnBoard = bettingBoard[0].querySelectorAll('.placed');
          chipsOnBoard.forEach(chip => {
            if (multipliedAmountForParity > 0) {
              for (let i = 0; i < multipliedAmountForParity; i++) {
                console.log("attribute of chip: " + chip.getAttribute('data-value'));
                let value = chip.getAttribute('data-value');
                winningChipClone = new Chip(value);
                winningChipClone.element.style.boxShadow = '15px 15px 60px yellow';
                winningChipClone.element.style.zIndex = '10000000';
                placeChipOnBoard(winningChipClone.element, bettingBoard[0]);
              }
            } else {
              console.log("attribute of chip: " + chip.getAttribute('data-value'));
              let value = chip.getAttribute('data-value');
              winningChipClone = new Chip(value);
              winningChipClone.element.style.boxShadow = '15px 15px 60px yellow';
              winningChipClone.element.style.zIndex = '10000000';
              placeChipOnBoard(winningChipClone.element, bettingBoard[0]);
            }
          })
        }, 1)
      } else if (winningNumber % 2 !== 0) {
        bettingBoard[1].classList.add('winning-board');
        setTimeout(() => {
          const chipsOnBoard = bettingBoard[1].querySelectorAll('.placed');
          chipsOnBoard.forEach(chip => {
            if (multipliedAmountForParity > 0) {
              for (let i = 0; i < multipliedAmountForParity; i++) {
                let value = chip.getAttribute('data-value');
                winningChipClone = new Chip(value);
                winningChipClone.element.style.boxShadow = '15px 15px 60px yellow';
                winningChipClone.element.style.zIndex = '10000000';
                placeChipOnBoard(winningChipClone.element, bettingBoard[1]);
              }
            } else {
              let value = chip.getAttribute('data-value');
              winningChipClone = new Chip(value);
              winningChipClone.element.style.boxShadow = '15px 15px 60px yellow';
              winningChipClone.element.style.zIndex = '10000000';
              placeChipOnBoard(winningChipClone.element, bettingBoard[1]);
            }
          })
        }, 1);
      }
      board.classList.add('winning-board');
    }
  })
}
const clearChips = () => {
  if (bets.length > 0) {
    const bettingBoard = document.querySelectorAll('.betting-board');
    bettingBoard.forEach(board => {
      console.log(`This board is a: ` + (board.classList.contains('winning-board') ? 'Winner' : 'Loser') + board.id);
      if (!board.classList.contains('winning-board')) {
        const placedChips = board.querySelectorAll('.placed');
        placedChips.forEach(chip => {
          chip.style.transition = 'top 3s ease'; // Change transition to top property
          chip.style.top = '-1000px'; // Remove !important
          console.log('loser');
          setTimeout(() => {
            console.log("Removing chip with value of: " + chip.dataset.value);
            chip.remove();
          }, 3500);
          bets.length = 0;
          updateBetDisplay(0);
        })
      } else {
        const placedChips = board.querySelectorAll('.placed');
        placedChips.forEach(chip => {
          chip.style.transition = 'top 3s ease'; // Change transition to top property
          chip.style.top = '1000px'; // Remove !important
          console.log('winner');
          setTimeout(() => {
            console.log("Removing chip with value of: " + chip.dataset.value);
            chip.remove();
            bets.length = 0;
            updateBetDisplay(0);
          }, 3500);

        })
      }
      board.classList.remove('winning-board');
    });
  } else {
    console.log('No chips to remove');
  }
};
const handleClearBoardClick = () => {
  const bettingBoard = document.querySelectorAll('.betting-board');
  bettingBoard.forEach(board => {
    const placedChips = board.querySelectorAll('.placed');
    placedChips.forEach(chip => {
      console.log(` removing chip with value: ` + chip.dataset.value);
      chip.remove();
    })
  })
  bets.length = 0;
  updateBetDisplay(0);
  if (lastRoundsBets.length > 0)
    replayButton.classList.remove('bets-on');
}
const clearBoardButton = document.getElementById('clear-board-button');
const clearBoardInstructions = document.getElementById('clear-board-instructions');
clearBoardButton.addEventListener('click', handleClearBoardClick);
clearBoardButton.addEventListener('mouseenter', function () {
  clearBoardInstructions.classList.add('show');
  setTimeout(() => {
    clearBoardInstructions.classList.remove('show');
  }, 1000);
});
clearBoardButton.addEventListener('mouseleave', function () {
  clearBoardInstructions.classList.remove('show');

});

let isDragging = null;
const placeChipOnBoard = (chip, board) => {
  // chip.classList.remove('dragging');
  chip.classList.add('placed');

  const clonedChip = chip.cloneNode(true);

  // Get the dimensions of the board
  const boardWidth = board.clientWidth;
  const boardHeight = board.clientHeight;

  // Calculate random positions within the board
  const topPos = Math.random() * (boardHeight - (clonedChip.offsetHeight + 50));
  const leftPos = Math.random() * (boardWidth - (clonedChip.offsetWidth + 50));

  // Set the position styles
  clonedChip.style.top = `${topPos}px`;
  clonedChip.style.left = `${leftPos}px`;

  // Optionally, randomize bottom and right positions
  // to avoid always having top-left alignment
  const bottomPos = Math.random() * (boardHeight - (clonedChip.offsetHeight + 50));
  const rightPos = Math.random() * (boardWidth - (clonedChip.offsetWidth + 50));

  clonedChip.style.bottom = `${bottomPos}px`;
  clonedChip.style.right = `${rightPos}px`;

  board.appendChild(clonedChip);

  console.log(`Chip position on ${board.id}: top=${topPos}, left=${leftPos}`);
};

class Board {
  constructor() {
    this.chipValues = [0.005, 0.01, 0.1, 1];
    this.bets = [];
    this.isDragging = false;
    this.chipReleased = false;
    this.setupEventListeners();
  }

  setupEventListeners() {
    const boards = document.querySelectorAll('.betting-board');
    boards.forEach(board => {
      board.addEventListener('dragover', (e) => this.dragOver(e));
      board.addEventListener('mouseover', (e) => this.dragEnter(e));
      board.addEventListener('mouseout', () => this.dragLeave());
      board.addEventListener('click', (e) => this.dragDrop(e)); // arrow function for clarity
    });
  }

  dealChips() {
    this.chipValues.forEach(value => {
      const chip = new Chip(value, this);
      chip.render();
    });
  }

  dragOver(e) {
    e.preventDefault();
  }

  dragEnter(e) {
    e.preventDefault();
  }

  dragLeave() {
  }
  dragDrop(e) {
    e.preventDefault();

    if (this.bets.length >= 10) {
      const chip = document.querySelector('.dragging');
      chip.remove();
      setTimeout(() => {
        alert("Ten bets max.");
      }, 100);
      return;
    }
    const chip = document.querySelector('.dragging');
    if (!chip) return;
    // Process chip drop on a valid board
    const chipValue = parseFloat(chip.getAttribute('data-value'));
    chip.classList.remove('dragging');
    const board = e.currentTarget;
    const boardValue = parseInt(board.getAttribute('data-value'));
    let betType = boardValue < 7 ? 0 : boardValue < 9 ? 1 : 2;
    let valueInWei = web3.utils.toWei(chipValue.toString(), 'ether');
    let stringWei = valueInWei.toString();

    const newBetObj = {
      amount: stringWei,
      betType,
      guess: boardValue <= 6 ? boardValue : boardValue === 7 ? 1 : boardValue === 8 ? 2 : boardValue === 9 ? 1 : 2
    };
    this.bets.push(newBetObj);
    const chipNode = chip.cloneNode(true);
    const chipNodeValue = chipNode.getAttribute('data-value');
    chipNode.style.position = 'absolute';
    chipNode.addEventListener('click', () => {
      removeChip(chipNode, chipNodeValue, boardValue);
    })
    // Calculate position relative to the board
    const boardRect = board.getBoundingClientRect();
    const offsetX = e.clientX - boardRect.left - 30;
    const offsetY = e.clientY - boardRect.top - 50;

    chipNode.style.left = `${offsetX}px`; // Adjust left position relative to board
    chipNode.style.top = `${offsetY}px`; // Adjust top position relative to board

    board.appendChild(chipNode);
    let totalBetAmount = this.calculateTotalBetAmount();
    this.updateBetDisplay(totalBetAmount);
    chip.remove();
    console.log(`${chipValue} matic placed on ${boardValue <= 6
      ? boardValue
      : boardValue === 7
        ? 'odd'
        : boardValue === 8
          ? 'even'
          : boardValue === 9
            ? 'red'
            : 'black'
      } with bet type ${betType == 0 ? 'number' : betType == 1 ? 'parity' : 'color'}`);
    console.log(`Number of bets: ${this.bets.length}`);
    console.log("Bets", bets);

    if (bets.length > 0) {
      playButton.classList.add("active");
      replayButton.classList.add('bets-on');
    }
  }
  async updateBetDisplay(totalBetAmount) {
    try {
      let currentBalance = await fetchBalance();
      let roundNumber = await fetchRoundNumber();
      if (roundNumber !== parseInt(round.textContent)) {
        round.textContent = roundNumber;
      }
      let betAmountInMatic = web3.utils.fromWei(totalBetAmount.toString());
      console.log(betAmountInMatic);
      if (currentBalance !== null) {
        let remainingBalance = currentBalance - betAmountInMatic;
        const balanceElement = document.getElementById('balance');
        if (parseFloat(balanceElement.textContent) !== remainingBalance) {
          balanceElement.textContent = remainingBalance.toFixed(3);
          balanceElement.appendChild(polygonImage);
          increaseAnimation();
        }
        const totalBetElement = document.getElementById('totalBetAmount');
        if (totalBetElement) {
          totalBetElement.classList.add('hidden2');
          setTimeout(() => {
            let stringValue = web3.utils.fromWei(totalBetAmount.toString(), 'ether');
            let splicedValue = stringValue.slice(1);
            if (stringValue == 0) {
              totalBetElement.textContent = `${stringValue}`
            } else if (stringValue >= 0 && stringValue < 1) {
              totalBetElement.textContent = `${splicedValue}`;
            } else if (stringValue >= 1) {
              totalBetElement.textContent = `${stringValue}`;
            }
            totalBetElement.classList.remove('hidden2');
          }, 150);
        }
      } else {
        console.error("Failed to fetch current balance.");
      }
    } catch (error) {
      console.error("Error displaying total bet amount:", error);
    }
  };
  calculateTotalBetAmount() {
    return bets ? bets.reduce((total, bet) => total.add(web3.utils.toBN(bet.amount)), web3.utils.toBN('0')) : '';
  };
}

class Chip {
  constructor(value) {
    this.value = value;
    this.element = this.createChipElement();
  }
  createChipElement() {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.setAttribute('data-value', this.value);
    const classMap = {
      0.005: 'chip-0_1',
      0.01: 'chip-0_25',
      0.1: 'chip-0_5',
      1: 'chip-1',
    }
    chip.classList.add(classMap[this.value] || '');
    chip.innerHTML = `
      <div class="center-circle ${this.getCssClass()}"></div>
      <div class="center-circle value">${this.value}</div>
      <div class="l-axis ${this.getCssClass()}"></div>
      <div class="lh-axis ${this.getCssClass()}"></div>
      <div class="r-axis ${this.getCssClass()}"></div>
      <div class="rh-axis ${this.getCssClass()}"></div>
      <div class="t-axis ${this.getCssClass()}"></div>
      <div class="th-axis ${this.getCssClass()}"></div>
      <div class="b-axis ${this.getCssClass()}"></div>
      <div class="bh-axis ${this.getCssClass()}"></div>
    `;
    chip.addEventListener('click', (event) => this.handleClick(event));
    return chip;
  }
  getCssClass() {

    const axisClassMap = {
      0.005: 'tenth',
      0.01: 'twentyFifth',
      0.1: 'fiftieth',
      1: 'one',
    }
    return axisClassMap[this.value] || '';
  }
  handleClick(event) {
    const containerToAppend = this.getChipContainer();
    const chip = event.target.closest('.chip');
    const chipNode = chip.cloneNode(true);
    chipNode.classList.add('dragging');
    isDragging = true;
    chipNode.style.zIndex = 1000;
    containerToAppend.appendChild(chipNode);

    const moveChip = (e) => {
      if (isDragging) {
        const chipStack = document.querySelectorAll('.chip');
        chipStack.forEach(stack => {
          if (!stack.classList.contains('dragging')) {
            stack.classList.add('disabled');
          }
        })
        requestAnimationFrame(() => {
          chipNode.style.left = `${e.clientX - 40}px`;
          chipNode.style.top = `${e.clientY - 60}px`;
        });
      }
    };

    const releaseChip = () => {
      const chipRect = chipNode.getBoundingClientRect();
      let droppedOutside = true;
      // Check if chip is released outside any board
      const boards = document.querySelectorAll('.betting-board');
      boards.forEach(board => {
        const boardRect = board.getBoundingClientRect();
        if (!(chipRect.right - 50 <= boardRect.left ||
          chipRect.left + 50 >= boardRect.right ||
          chipRect.bottom - 50 <= boardRect.top ||
          chipRect.top + 50 >= boardRect.bottom)) {
          droppedOutside = false;
        }
      });
      // Check if chip is released inside the black-bet-container
      const blackBetContainer = document.getElementById('black-bet-container');
      let blackBetRect = 0;
      if (blackBetContainer) {
        blackBetRect = blackBetContainer.getBoundingClientRect();
      }
      if (!(chipRect.right - 50 <= blackBetRect.left ||
        chipRect.left + 50 >= blackBetRect.right ||
        chipRect.bottom - 50 <= blackBetRect.top ||
        chipRect.top + 50 >= blackBetRect.bottom)) {
        droppedOutside = false;
      }
      if (droppedOutside) {
        document.removeEventListener('mousemove', moveChip);
        document.removeEventListener('mouseup', releaseChip);
        isDragging = false;
        const chipStack = document.querySelectorAll('.chip');
        chipStack.forEach(stack => {
          stack.classList.remove('disabled');
        })
        chipNode.remove();

        return;
      }
      chipNode.classList.add('placed');
      document.removeEventListener('mousemove', moveChip);
      document.removeEventListener('mouseup', releaseChip);
      isDragging = false;
      const chipStack = document.querySelectorAll('.chip');
      chipStack.forEach(stack => {
        stack.classList.remove('disabled');
      })

    };

    document.addEventListener('mousemove', moveChip);
    document.addEventListener('mouseup', releaseChip);
    if (!isDragging) {
      chipReleased = false;
    }
  }

  render() {
    const chipContainer = this.getChipContainer();
    if (chipContainer) {
      chipContainer.appendChild(this.element);
    }
    else
      console.log("Error getting chip container class. Value of chipContainer: ", + chipContainer);
  }

  getChipContainer() {
    const chipContainerMap = {
      0.005: 'chip0_1',
      0.01: 'chip0_25',
      0.1: 'chip0_5',
      1: 'chip1_0',
    }

    return document.getElementById(chipContainerMap[this.value] || 'chips');
  }
}
const handleReplayBetButton = () => {
  if (lastRoundsBets.length == 0 || bets.length > 0)
    return;
  const bettingBoard = document.querySelectorAll('.betting-board');
  playButton.classList.add('active');
  lastRoundsBets.forEach(bet => {
    const boardWidth = bettingBoard[0].clientWidth;
    const boardHeight = bettingBoard[0].clientHeight;
    const amount = bet["amount"];
    const betType = bet["betType"];
    const guess = bet["guess"];
    const newBetObj = {
      amount,
      betType,
      guess
    }
    bets.push(newBetObj);
    const value = web3.utils.fromWei(bet["amount"]);
    const replacementChip = new Chip(value);
    const replacementClone = replacementChip.element.cloneNode(true);
    const topPos = Math.random() * (boardHeight - (replacementClone.offsetHeight + 150));
    const leftPos = Math.random() * (boardWidth - (replacementClone.offsetWidth + 150));
    const bottomPos = Math.random() * (boardHeight - (replacementClone.offsetHeight - 150));
    const rightPos = Math.random() * (boardWidth - (replacementClone.offsetWidth - 150));
    replacementClone.classList.add('placed');
    replacementClone.style.position = 'absolute';
    replacementClone.style.bottom = `${bottomPos}px`;
    replacementClone.style.right = `${rightPos}px`;
    replacementClone.style.top = `${topPos}px`;
    replacementClone.style.left = `${leftPos}px`;
    replacementClone.addEventListener('click', () => {
      removeChip(replacementClone, value, boardIndex);
    })
    const boardIndex = guess == 1 && betType == 1 ? 1 : guess == 2 && betType == 1 ? 0 : guess == 1 && betType == 2 ? 9 : guess == 2 && betType == 2 ? 8 : guess == 1 ? 2 : guess == 2 ? 3 : guess == 3 ? 4 : guess == 4 ? 5 : guess == 5 ? 6 : guess == 6 ? 7 : '';
    bettingBoard[boardIndex].appendChild(replacementClone);
  })
  updateBetDisplay(calculateTotalBetAmount());
  console.log(bets);
}
replayButton.addEventListener('click', handleReplayBetButton);
const replayBetInstructions = document.getElementById('replay-bet-instructions');
replayButton.addEventListener('mouseenter', function () {
  replayBetInstructions.classList.add('show');
  setTimeout(() => {
    replayBetInstructions.classList.remove('show');
  }, 1000);
})
replayButton.addEventListener('mouseleave', function () {
  replayBetInstructions.classList.remove('show');
})

const removeChip = (chip, value, boardValue) => {
  // Remove the chip from the DOM
  chip.remove();
  // Convert value to Wei
  const valueInWei = web3.utils.toWei(value, 'ether');
  const guess = parseInt(boardValue <= 6 ? boardValue : boardValue == 7 ? 1 : boardValue == 8 ? 2 : boardValue == 9 ? 1 : 2);
  // Remove the bet from the bets array
  const index = bets.findIndex(bet => bet.amount == valueInWei || bet.guess == guess);
  if (index !== -1) {
    bets.splice(index, 1);
    console.log(`${valueInWei} removed from ${boardValue}. Original value: ${value}`);
    console.log(`Number of remaining bets: ${bets.length}`);
    bets.forEach(bet => console.log(bet)); // Log remaining bets for debugging
  } else {
    console.log(`No matching bet found for removal: ${valueInWei}, ${boardValue}. Original value: ${value}`);
  }
  updateBetDisplay(calculateTotalBetAmount())
};
const evenBetButton = document.getElementById('even-bet-button');
const handleEvenBetClick = () => {
  const chip = document.querySelector('.dragging');
  chip.remove();
  console.log(chip);

  if (!chip) return;
  if (bets.length > 6) {
    console.log('Max bet is ten');
    chip.remove();
    return;
  }
  const numberedBoard = document.querySelectorAll('.numbered-board');
  console.log('blackBetClicked')
  const boardWidth = numberedBoard[0].clientWidth;
  const boardHeight = numberedBoard[0].clientHeight;
  chip.remove();
  const chipValue = parseFloat(chip.getAttribute('data-value'));
  chip.classList.remove('dragging');
  let valueInWei = web3.utils.toWei(chipValue.toString(), 'ether');
  let amount = valueInWei.toString();
  let betType = 0;
  numberedBoard.forEach((board) => {
    if (parseInt(board.getAttribute('data-value')) % 2 == 0) {
      const guess = parseInt(board.getAttribute('data-value'));
      const newBetObj = {
        amount,
        betType,
        guess
      };
      bets.push(newBetObj);
      const replacementChip = new Chip(chipValue);
      const replacementClone = replacementChip.element.cloneNode(true);
      const topPos = Math.random() * (boardHeight - (replacementClone.offsetHeight + 150));
      const leftPos = Math.random() * (boardWidth - (replacementClone.offsetWidth + 150));
      const bottomPos = Math.random() * (boardHeight - (replacementClone.offsetHeight - 150));
      const rightPos = Math.random() * (boardWidth - (replacementClone.offsetWidth - 150));
      replacementClone.classList.add('placed');
      replacementClone.style.position = 'absolute';
      replacementClone.style.bottom = `${bottomPos}px`;
      replacementClone.style.right = `${rightPos}px`;
      replacementClone.style.top = `${topPos}px`;
      replacementClone.style.left = `${leftPos}px`;
      replacementClone.addEventListener('click', () => {
        removeChip(replacementClone, amount, guess);
      })
      board.appendChild(replacementClone)
    }
  })
  updateBetDisplay(calculateTotalBetAmount());
  playButton.classList.add('active');
}
evenBetButton.addEventListener('click', handleEvenBetClick);
evenBetButton.addEventListener('mouseenter', function () {
  let dragging = document.querySelector('.dragging');
  if (!dragging)
    document.getElementById('even-bet-instructions').classList.add('show');
  else if (dragging) {
    console.log('Dragging');
    dragging.style.transition = 'scale .15s';
    dragging.style.scale = '0.6';
    this.style.boxShadow = '1px 1px 1px 5px rgba(255,255,255,.1)';

  } else
    console.log('Trouble with mouseenter');
})
evenBetButton.addEventListener('mouseleave', function () {
  let dragging = document.querySelector('.dragging');
  document.getElementById('even-bet-instructions').classList.remove('show');
  this.style.boxShadow = '';
  if (dragging)
    dragging.style.scale = '';
})


const oddBetButton = document.getElementById('odd-bet-button');
const handleOddBetClick = () => {
  const chip = document.querySelector('.dragging');
  chip.remove();
  console.log(chip);

  if (!chip) return;
  if (bets.length > 6) {
    console.log('Max bet is ten');
    chip.remove();
    return;
  }
  const numberedBoard = document.querySelectorAll('.numbered-board');
  console.log('blackBetClicked')
  const boardWidth = numberedBoard[0].clientWidth;
  const boardHeight = numberedBoard[0].clientHeight;
  chip.remove();
  const chipValue = parseFloat(chip.getAttribute('data-value'));
  chip.classList.remove('dragging');
  let valueInWei = web3.utils.toWei(chipValue.toString(), 'ether');
  let amount = valueInWei.toString();
  let betType = 0;
  numberedBoard.forEach((board) => {
    if (parseInt(board.getAttribute('data-value')) % 2 != 0) {
      const guess = parseInt(board.getAttribute('data-value'));
      const newBetObj = {
        amount,
        betType,
        guess
      };
      bets.push(newBetObj);
      const replacementChip = new Chip(chipValue);
      const replacementClone = replacementChip.element.cloneNode(true);
      const topPos = Math.random() * (boardHeight - (replacementClone.offsetHeight + 150));
      const leftPos = Math.random() * (boardWidth - (replacementClone.offsetWidth + 150));
      const bottomPos = Math.random() * (boardHeight - (replacementClone.offsetHeight - 150));
      const rightPos = Math.random() * (boardWidth - (replacementClone.offsetWidth - 150));
      replacementClone.classList.add('placed');
      replacementClone.style.position = 'absolute';
      replacementClone.style.bottom = `${bottomPos}px`;
      replacementClone.style.right = `${rightPos}px`;
      replacementClone.style.top = `${topPos}px`;
      replacementClone.style.left = `${leftPos}px`;
      replacementClone.addEventListener('click', () => {
        removeChip(replacementClone, amount, guess);
      })
      board.appendChild(replacementClone)
    }
  })
  updateBetDisplay(calculateTotalBetAmount());
  playButton.classList.add('active');
}
oddBetButton.addEventListener('click', handleOddBetClick);
oddBetButton.addEventListener('mouseenter', function () {
  let dragging = document.querySelector('.dragging');
  if (!dragging)
    document.getElementById('odd-bet-instructions').classList.add('show');
  else if (dragging) {
    console.log('Dragging');
    dragging.style.transition = 'scale .15s';
    dragging.style.scale = '0.6';
    this.style.boxShadow = '1px 1px 1px 5px rgba(255,255,255,.1)';

  } else
    console.log('Trouble with mouseenter');
})
oddBetButton.addEventListener('mouseleave', function () {
  let dragging = document.querySelector('.dragging');
  document.getElementById('odd-bet-instructions').classList.remove('show');
  this.style.boxShadow = '';
  if (dragging)
    dragging.style.scale = '';
})




const blackBetButton = document.getElementById('black-bet-button');
const handleBlackBetClick = () => {
  const chip = document.querySelector('.dragging');
  chip.remove();
  console.log(chip);

  if (!chip) return;
  if (bets.length > 6) {
    console.log('Max bet is ten');
    chip.remove();
    return;
  }
  const numberedBoard = document.querySelectorAll('.numbered-board');
  console.log('blackBetClicked')
  const boardWidth = numberedBoard[0].clientWidth;
  const boardHeight = numberedBoard[0].clientHeight;
  chip.remove();
  const chipValue = parseFloat(chip.getAttribute('data-value'));
  chip.classList.remove('dragging');
  let valueInWei = web3.utils.toWei(chipValue.toString(), 'ether');
  let amount = valueInWei.toString();
  let betType = 0;
  numberedBoard.forEach((board) => {
    if (board.classList.contains('black')) {
      const guess = parseInt(board.getAttribute('data-value'));
      const newBetObj = {
        amount,
        betType,
        guess
      };
      bets.push(newBetObj);
      const replacementChip = new Chip(chipValue);
      const replacementClone = replacementChip.element.cloneNode(true);
      const topPos = Math.random() * (boardHeight - (replacementClone.offsetHeight + 150));
      const leftPos = Math.random() * (boardWidth - (replacementClone.offsetWidth + 150));
      const bottomPos = Math.random() * (boardHeight - (replacementClone.offsetHeight - 150));
      const rightPos = Math.random() * (boardWidth - (replacementClone.offsetWidth - 150));
      replacementClone.classList.add('placed');
      replacementClone.style.position = 'absolute';
      replacementClone.style.bottom = `${bottomPos}px`;
      replacementClone.style.right = `${rightPos}px`;
      replacementClone.style.top = `${topPos}px`;
      replacementClone.style.left = `${leftPos}px`;
      replacementClone.addEventListener('click', () => {
        removeChip(replacementClone, amount, guess);
      })
      board.appendChild(replacementClone)
    }
  })
  updateBetDisplay(calculateTotalBetAmount());
  playButton.classList.add('active');
}
blackBetButton.addEventListener('click', handleBlackBetClick)
blackBetButton.addEventListener('mouseenter', function () {
  let dragging = document.querySelector('.dragging');
  if (!dragging)
    document.getElementById('black-bet-instructions').classList.add('show');
  else if (dragging) {
    console.log('Dragging');
    dragging.style.transition = 'scale .15s';
    dragging.style.scale = '0.6';
    this.style.boxShadow = '1px 1px 1px 5px rgba(255,255,255,.1)';

  } else
    console.log('Trouble with mouseenter');
})
blackBetButton.addEventListener('mouseleave', function () {
  let dragging = document.querySelector('.dragging');
  document.getElementById('black-bet-instructions').classList.remove('show');
  this.style.boxShadow = '';
  if (dragging)
    dragging.style.scale = '';
})

const redBetButton = document.getElementById('red-bet-button');
const handleRedBetClick = () => {
  const chip = document.querySelector('.dragging');
  chip.remove();
  console.log(chip);

  if (!chip) return;
  if (bets.length > 6) {
    console.log('Max bet is ten');
    chip.remove();
    return;
  }
  const numberedBoard = document.querySelectorAll('.numbered-board');
  console.log('redBetClicked')
  const boardWidth = numberedBoard[0].clientWidth;
  const boardHeight = numberedBoard[0].clientHeight;
  chip.remove();
  const chipValue = parseFloat(chip.getAttribute('data-value'));
  chip.classList.remove('dragging');
  let valueInWei = web3.utils.toWei(chipValue.toString(), 'ether');
  let amount = valueInWei.toString();
  let betType = 0;
  numberedBoard.forEach((board) => {
    if (board.classList.contains('red')) {
      const guess = parseInt(board.getAttribute('data-value'));
      const newBetObj = {
        amount,
        betType,
        guess
      };
      bets.push(newBetObj);
      const replacementChip = new Chip(chipValue);
      const replacementClone = replacementChip.element.cloneNode(true);
      const topPos = Math.random() * (boardHeight - (replacementClone.offsetHeight + 150));
      const leftPos = Math.random() * (boardWidth - (replacementClone.offsetWidth + 150));
      const bottomPos = Math.random() * (boardHeight - (replacementClone.offsetHeight - 150));
      const rightPos = Math.random() * (boardWidth - (replacementClone.offsetWidth - 150));
      replacementClone.classList.add('placed');
      replacementClone.style.position = 'absolute';
      replacementClone.style.bottom = `${bottomPos}px`;
      replacementClone.style.right = `${rightPos}px`;
      replacementClone.style.top = `${topPos}px`;
      replacementClone.style.left = `${leftPos}px`;
      replacementClone.addEventListener('click', () => {
        removeChip(replacementClone, amount, guess);
      })
      board.appendChild(replacementClone)
    }
  })
  updateBetDisplay(calculateTotalBetAmount());
  playButton.classList.add('active');
}
redBetButton.addEventListener('click', handleRedBetClick);
redBetButton.addEventListener('mouseenter', function () {
  let dragging = document.querySelector('.dragging');
  if (!dragging)
    document.getElementById('red-bet-instructions').classList.add('show');
  else if (dragging) {
    console.log('Dragging');
    dragging.style.transition = 'scale .15s ease';
    dragging.style.scale = '0.6';
    this.style.transition = 'boxShadow 2s ease';
    this.style.boxShadow = '1px 1px 1px 5px rgba(255,255,255,.1)';

  } else
    console.log('Trouble with mouseenter');
})
redBetButton.addEventListener('mouseleave', function () {
  let dragging = document.querySelector('.dragging');
  document.getElementById('red-bet-instructions').classList.remove('show');
  this.style.boxShadow = '';
  if (dragging)
    dragging.style.scale = '';
})


// ANIMATIONS
const winAnimation = (amountWon, winningNumber) => {
  rollIndicator.classList.remove('active');
  var duration = 6 * 1000;
  var end = Date.now() + duration;
  let winMessage = document.getElementById('winMessage')
  winMessage.textContent = `+${amountWon.toFixed(2)} MATIC`;
  winMessage.classList.add('show');
  distributeWinningChips(winningNumber);
  setTimeout(() => {
    document.getElementById('winMessage').classList.remove('show');
  }, 6000);
  (function frame() {
    confetti({
      particleCount: 5,
      angle: 60,
      spread: 55,
      origin: { x: 0 }
    });
    confetti({
      particleCount: 5,
      angle: 120,
      spread: 55,
      origin: { x: 1 }
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  }());
}
const lossAnimation = (amountLost, winningNumber) => {
  rollIndicator.classList.remove('active');
  document.getElementById('lossParticles').classList.remove('hidden');
  document.getElementById('lossParticles').style.opacity = '0';
  distributeWinningChips(winningNumber);
  setTimeout(() => {
    document.getElementById('lossParticles').style.opacity = '1';
  }, 1);
  let lossMessage = document.getElementById('loseMessage');
  lossMessage.textContent = `-${amountLost.toFixed(2)} MATIC`;
  lossMessage.classList.add('show');
  particlesJS('lossParticles', {
    particles: {
      number: {
        value: 100
      },
      color: {
        value: ['#ff0000', '#ee0000', '#dd0000']
      },
      shape: {
        type: 'triangle',
        polygon: {
          nb_sides: 5
        },
      },
      opacity: {
        value: 0.25
      },
      size: {
        value: 9,
        random: true
      },
      move: {
        direction: 'bottom',
        speed: 5,
        out_mode: 'out'
      },
      line_linked: {
        enable: true,
        distance: 15,
        color: '#00ffff',
        opacity: 0.5,
        width: 5
      }
    },
    interactivity: {
      detect_on: 'canvas',
      events: {
        onhover: {
          enable: true,
          mode: 'repulse'
        },
        onclick: {
          enable: true,
          mode: 'push'
        }
      }
    },
    retina_detect: true // Enable retina display support
  });

  setTimeout(() => {
    document.getElementById('lossParticles').classList.add('hidden');
  }, 6000);
  setTimeout(() => {
    document.getElementById('lossParticles').style.opacity = '0';
  }, 5000);
  setTimeout(() => {
    lossMessage.classList.remove('show');
  }, 3000);
}
const breakEvenAnimation = (winningNumber) => {
  rollIndicator.classList.remove('active');
  document.getElementById('breakEven').style.opacity = '0';
  document.getElementById('breakEven').classList.remove('hidden');
  distributeWinningChips(winningNumber);
  setTimeout(() => {
    document.getElementById('breakEven').style.opacity = '1';
  }, 1);
  let lossMessage = document.getElementById('breakEvenMessage');
  lossMessage.textContent = `Break Even`;
  lossMessage.classList.add('show');
  particlesJS('breakEven', {
    particles: {
      number: { value: 100 },
      color: { value: '#ffffff' },
      shape: {
        type: 'circle',
      },
      opacity: { value: 0.9 },
      size: { value: 5, random: true },
      move: {
        direction: 'none',
        speed: 5,
        random: true,
        out_mode: 'out',
      },
      line_linked: {
        enable: true,
        distance: 30,
        color: '#00ffff',
        opacity: 0.5,
        width: 5
      }
    },
    interactivity: {
      detect_on: 'canvas',
      events: {
        onhover: { enable: false },
        onclick: { enable: false },
      },
    },
    retina_detect: true,
  });
  setTimeout(() => {
    document.getElementById('breakEven').classList.add('hidden');
    lossMessage.classList.remove('show');
  }, 7000);
  setTimeout(() => {
    document.getElementById('breakEven').style.opacity = '0';
  }, 6000);
  setTimeout(() => {
    lossMessage.classList.remove('show');
  }, 3000);

}
const rollAnimation = (winningNumber) => {
  const bettingBoard = document.querySelectorAll('.betting-board');
  const numberedBoards = document.querySelectorAll('.numbered-board');
  const carousel = document.querySelector('.carousel');
  const carouselHeight = 55;
  const targetOffset = -(winningNumber) * carouselHeight;
  carousel.style.transform = `translateY(${targetOffset}px)`;
  setTimeout(() => {
    numberedBoards.forEach(board => {
      if (board.getAttribute('data-value') === winningNumber) {
        if (board.classList.contains('red')) {
          bettingBoard[9].classList.add('winning-board');
        } else if (board.classList.contains('black')) {
          bettingBoard[8].classList.add('winning-board');
        }
        if (winningNumber % 2 == 0) {
          bettingBoard[0].classList.add('winning-board');
        } else if (winningNumber % 2 !== 0) {
          bettingBoard[1].classList.add('winning-board');
        }
        board.classList.add('winning-board');
      }
    })
  }, 2000)
  return targetOffset;
}
const unRollAnimation = (target) => {
  const bettingBoard = document.querySelectorAll('.betting-board');
  const numberedBoards = document.querySelectorAll('.numbered-board');
  const carousel = document.querySelector('.carousel');
  console.log("Unroll started.");
  setTimeout(() => {
    numberedBoards.forEach(board => {
      board.classList.remove('active');
    })
    carousel.style.transform = `translateY(0)`;
    console.log("Unroll complete.");
  }, 10000);
}
const increaseAnimation = () => {
  const totalBetAmount = document.getElementById('totalBetAmount');
  const balance = document.getElementById('balance');
  totalBetAmount.classList.add('increase');
  balance.classList.add('decrease');
  setTimeout(() => {
    totalBetAmount.classList.remove('increase');
    balance.classList.remove('decrease');
  }, 250)
}
const decreaseAnimation = () => {
  const totalBetAmount = document.getElementById('totalBetAmount');
  const balance = document.getElementById('balance');
  totalBetAmount.classList.add('decrease');
  balance.classList.add('increase');
  setTimeout(() => {
    totalBetAmount.classList.remove('decrease');
    balance.classList.remove('increase');
  }, 250)
}




// Initialize Three.js components
var canvas = document.createElement('canvas');
canvas.classList.add('dice-canvas');
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(100, window.innerWidth / window.innerHeight, 0.1, 1000);
var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true });
updateRendererSize(); // Call initially and on window resize
function updateRendererSize() {
  var width = window.innerWidth * 1;
  var height = window.innerHeight * 1;
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

document.body.appendChild(renderer.domElement);

// Define boundaries (example)
var minX = -1;
var maxX = 1;
var minY = -1;
var maxY = 1;

// Add lights
var ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

var directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(1, 1, 1).normalize();
scene.add(directionalLight);

// Setup camera position
camera.position.z = 5;

// Initialize Cannon.js physics
var world = new CANNON.World();
world.gravity.set(0, 0, -50); // gravity in m/s²

// Create a ground plane
var groundShape = new CANNON.Plane();
var groundBody = new CANNON.Body({ mass: 0 });
groundBody.addShape(groundShape);
world.addBody(groundBody);

// Function to roll dice to a specific number
function rollDiceToNumber(number) {
  var impulseForce = 10; // Adjust the impulse force as needed

  // Apply an impulse to roll the dice
  var impulse = new CANNON.Vec3(0, 0, impulseForce);
  diceBody.applyLocalImpulse(impulse, new CANNON.Vec3());

  // Set the target rotation based on the face number
  var targetRotation = new THREE.Quaternion();
  switch (number) {
    case 1:
      targetRotation.setFromAxisAngle(new THREE.Vector3(0, 2, 1), -Math.PI); // 1
      break;
    case 2:
      targetRotation.setFromAxisAngle(new THREE.Vector3(0, 1, 2), -Math.PI / 2);  // 2
      break;
    case 3:
      targetRotation.setFromAxisAngle(new THREE.Vector3(1, 1, 1), Math.PI); // 3
      break;
    case 4:
      targetRotation.setFromAxisAngle(new THREE.Vector3(1, 2, 0), Math.PI); // 4
      break;
    case 5:
      targetRotation.setFromAxisAngle(new THREE.Vector3(2, 1, 0), Math.PI / 2); // 5
      break;
    case 6:
      targetRotation.setFromAxisAngle(new THREE.Vector3(2, 2, 0), Math.PI); // 6
      break;
    default:
      console.error("Invalid number for dice face.");
      return;
  }
  diceBody.quaternion.copy(targetRotation);
}

// Load dice model
var diceBody;
var diceModel;
var loader = new THREE.GLTFLoader();
loader.load('models/dice.glb', function (gltf) {
  diceModel = gltf.scene;
  diceModel.position.set(0, 0, 1); // adjust position as needed
  // diceModel.visible = false;
  scene.add(diceModel);

  // Create Cannon.js body for the dice
  var diceShape = new CANNON.Box(new CANNON.Vec3(0.25, 0.25, 0.25)); // adjust size according to your dice model
  diceBody = new CANNON.Body({ mass: 2 });
  diceBody.addShape(diceShape);
  diceBody.position.copy(diceModel.position);
  world.addBody(diceBody);

  // Update dice model position and rotation based on physics simulation
  function updateDiceModel() {
    diceModel.position.copy(diceBody.position);
    diceModel.quaternion.copy(diceBody.quaternion);
  }

  // Handle mouse click to roll the dice
  var raycaster = new THREE.Raycaster();
  var mouse = new THREE.Vector2();



  // Render loop
  function render() {
    requestAnimationFrame(render);

    // Update physics
    world.step(1 / 60);

    // Update dice model position based on physics
    updateDiceModel();

    // Check boundaries and adjust position
    var pos = diceBody.position;
    if (pos.x < minX) {
      pos.x = minX;
      diceBody.velocity.x *= -0.5; // Bounce back with reduced velocity
    }
    if (pos.x > maxX) {
      pos.x = maxX;
      diceBody.velocity.x *= -0.5;
    }
    if (pos.y < minY) {
      pos.y = minY;
      diceBody.velocity.y *= -0.5;
    }
    if (pos.y > maxY) {
      pos.y = maxY;
      diceBody.velocity.y *= -0.5;
    }

    renderer.render(scene, camera);
  }

  render(); // Start the rendering loop
});

// Update renderer size on window resize
window.addEventListener('resize', updateRendererSize);
function resetScene() {
  // Remove existing dice model if it exists
  if (diceModel) {
    scene.remove(diceModel);
    diceModel = null;
  }

  // Remove existing dice physics body if it exists
  if (diceBody) {
    world.removeBody(diceBody);
    diceBody = null;
  }

  // Reload dice model and physics body
  loader.load('models/dice.glb', function (gltf) {
    diceModel = gltf.scene;
    diceModel.position.set(0, 0, 1); // adjust position as needed
    scene.add(diceModel);

    var diceShape = new CANNON.Box(new CANNON.Vec3(0.25, 0.25, 0.25)); // adjust size according to your dice model
    diceBody = new CANNON.Body({ mass: 2 });
    diceBody.addShape(diceShape);
    diceBody.position.copy(diceModel.position);
    world.addBody(diceBody);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    document.getElementById('overlay').classList.add('loaded');
  }, 2000)// 2. Retrieve the bets array from localStorage
})

let intervalId = setInterval(() => {
  let kinKin = document.querySelector('#kins-kins-popup');
  if (kinKin) {
    kinKin.remove();
    clearInterval(intervalId); // Stop checking once element is found and removed
  }
}, 1500);
