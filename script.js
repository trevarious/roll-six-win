
import { contractABI } from './abi.js';
import { contractAddress } from './address.js'; 

let web3;
let contract;
let userAccount;


const createAccountButton = document.getElementById("account-button");
const depositButton = document.getElementById("deposit-button");
const connectWalletButton = document.getElementById("connect-wallet-button");
const playButton = document.getElementById("place-bet-button");
const balance = document.getElementById("balance");
const round = document.getElementById("round");
const numberedBoards = document.querySelectorAll('.numbered-board');

const initialize = async () => {
  if (window.ethereum) {
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      userAccount = accounts[0];
      web3 = new Web3(window.ethereum);
      contract = new web3.eth.Contract(contractABI, contractAddress);
      connectWalletButton.disabled = true;
      const timestamp = new Date().toLocaleString();
      console.log(`Log in successful at ${timestamp}`);
      const accountConnectionIndicator = document.getElementById("log-status-indicator");
      accountConnectionIndicator.classList.add('logged-in');
      const rollIndicator = document.getElementById('roll-indicator');
      rollIndicator.classList.add('active');
      setTimeout(() => { rollIndicator.classList.remove('active') }, 2000);
      updateAccountDisplay();
      let totalBetAmount = calculateTotalBetAmount();
      updateBetDisplay(totalBetAmount);
      updateColorMapping();
      fetchAndUpdateConsecutiveWins();
      dealChips();
    } catch (error) {
      console.log(error);
      alert("There was an error connecting wallet");
    }
  } else {
    console.log("Failed to make request");
    alert("Failed to make request");
  }
};
connectWalletButton.addEventListener("click", initialize);
// Handles updating UI account wallet address display
const accountAddress = document.getElementById('wallet-address');
const updateAccountDisplay = async () => {
  try {
    const isAccountCreated = await contract.methods.getAccountStatus(userAccount).call({ from: userAccount });
    if(isAccountCreated) {
      const balanceValue = await contract.methods.getBalance().call({from: userAccount});
      const balanceInMatic = web3.utils.fromWei(balanceValue);
      const roundValue = await contract.methods.getCurrentRound().call({from: userAccount});
      depositButton.classList.add('active');
      createAccountButton.style.display = 'none';
      connectWalletButton.style.display = 'none';
      let sliceAmount = balanceInMatic > 0 && balanceInMatic < 10 ? 4 : balanceInMatic < 100 ? 5 : balanceInMatic < 1000 ? 6 : balanceInMatic < 10000 ? 7 : 0; 
      balance.textContent = balanceInMatic.slice(0, sliceAmount);
      if(balanceInMatic < 1) {
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
// Handles updating the UI bet section including the balance and total bet
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
const updateBetDisplay = async (totalBetAmount) => {
  try {
    let currentBalance = await fetchBalance();
    let betAmountInMatic = web3.utils.fromWei(totalBetAmount.toString());
    if (currentBalance !== null) {
      let remainingBalance = currentBalance - betAmountInMatic; 
      const balanceElement = document.getElementById('balance'); 
      if (balanceElement) {
        balanceElement.textContent = remainingBalance.toFixed(2); 
      }
      const totalBetElement = document.getElementById('totalBetAmount');
      if (totalBetElement) {
        totalBetElement.classList.add('hidden2'); 
        balance.classList.add('hidden3');
        setTimeout(() => {
          let stringValue =  web3.utils.fromWei(totalBetAmount.toString(), 'ether');
          let splicedValue = stringValue.slice(1);
          if(stringValue  == 0) {
            totalBetElement.textContent = `${stringValue}`
          } else if (stringValue >= 0 && stringValue < 1) {
            totalBetElement.textContent = `${splicedValue}`;
          } else if (stringValue >= 1) {
            totalBetElement.textContent = `${stringValue}`;
          }
          totalBetElement.classList.remove('hidden2'); 
          balance.classList.remove('hidden3');
        }, 150);
      }
    } else {
      console.error("Failed to fetch current balance.");
    }
  } catch (error) {
    console.error("Error displaying total bet amount:", error);
  }
};
// Handles updating the color assignment for each numbered board
const fetchColorMapping = async () => {
    try {
        const result = await contract.methods.getColorMapping().call();
        return result; // Returns uint8[6] array
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
          console.log("Index " + index + " with value " + colorMapping[index] + ", color applied: " + color);
        }, 3000)
    });
    console.log("Colors assigned:", colors);
}
// Handles displaying multiplier for the board
const fetchAndUpdateConsecutiveWins = async () => {
    try {
        // Call the getConsecutiveWins function from your contract
        const result = await contract.methods.getConsecutiveWins().call({from: userAccount});

        // Update the UI based on the result
        console.log(result);
        // updateLights('number', result[0]);
        updateBoardMultiplier('.number-streaks',result[0]);
        // updateLights('parity', result[1]);
        updateBoardMultiplier('.parity-streaks',result[1]);
        // updateLights('color', result[2]);  
        updateBoardMultiplier('.color-streaks',result[2]);

    } catch (error) {
        console.error('Error fetching consecutive wins:', error);
    }
}
const updateBoardMultiplier = (elementclass,multipliedAmount) => {
  const boardToChange = document.querySelectorAll(`${elementclass}`);
  if(elementclass == '.parity-streaks' || elementclass == '.color-streaks') {
    multipliedAmount = multipliedAmount == 1 ? multipliedAmount : multipliedAmount == 2 ? 1.5 : multipliedAmount == 3 ? 2 : multipliedAmount == 4 ? 2.5 : multipliedAmount == 5 ? 3 : multipliedAmount == 6 ? 4 : multipliedAmount == 7 ? 5 : multipliedAmount == 8 ? 6 : '';
  }
  boardToChange.forEach(board => {
    const previousWinMultiplier = board.querySelector('.win-multiplier');
    if (previousWinMultiplier) {
      board.removeChild(previousWinMultiplier);
    }
    if(multipliedAmount > 1){
      if(elementclass == '.parity-streaks') {
        const element = document.createElement('div');
        element.classList.add('win-multiplier');
        element.style.color = 'white';
        element.textContent =  `${multipliedAmount}x`;
        board.appendChild(element);
      } else if(elementclass == '.number-streaks') {
        const element = document.createElement('div');
        element.classList.add('win-multiplier');
        element.style.color = 'white';
        element.style.position = 'absolute';
        element.style.top = '25%';
        if(multipliedAmount > 2 ) {        element.textContent =  `${multipliedAmount == 3 ? .1 : multipliedAmount == 4 ? .5 : multipliedAmount == 5 ? .5 : multipliedAmount == 6 ? 1 : ''}%`;}
        board.appendChild(element);

      } else if( elementclass == '.color-streaks') {
        const element = document.createElement('div');
        element.classList.add('win-multiplier');
        element.style.color = 'white';
        element.style.top = '30%';
        element.textContent =  `${multipliedAmount}x`;
        board.appendChild(element);
      }
    }
  })
}
const dealChips = async () => {
  const chipsContainer = document.getElementById('chips');
  const tenthStack = document.getElementById('chip0_1');
  let tenthCounter = 0;
  const twentyFifthStack = document.getElementById('chip0_25');
  let twentyFifthCounter = 0;
  const fiftiethStack = document.getElementById('chip0_5');
  let fiftiethCounter = 0;
  const oneStack = document.getElementById('chip1_0');
  let oneCounter = 0;
  const chipValues = [1, 0.5, 0.25, 0.1]; // Define your chip values in descending order for better logic
  let amountDistributed = 0;
  let amountToDistribute = 0;
  try {
    const balanceValue = await contract.methods.getBalance().call({ from: userAccount });
    const balanceInMatic = web3.utils.fromWei(balanceValue);

    let remainingBalance = parseFloat(balanceInMatic); // Parse float to ensure accurate comparisons
    amountToDistribute = remainingBalance; // Parse float to ensure accurate comparisons
    while (amountToDistribute >= amountDistributed) {
      for (let i = 0; i < chipValues.length; i++) {
        let randomHundreths = Math.floor(Math.random() * 10);
        let translateY = parseFloat(`67.9${randomHundreths}`);
        let randomXtranslate = Math.floor(Math.random() * (16 - 10)) + 20;
        let randomRotation = Math.floor(Math.random() * 45);
        const value = chipValues[i];
        const chip = document.createElement('div');
        chip.className = 'chip';
        chip.setAttribute('draggable', 'true');
        chip.setAttribute('data-value', value);

        chip.innerHTML = `
          <div class="x-axis"></div>
          <div class="y-axis"></div>
          <div class="center-circle"></div>
          <div class="center-circle value">${value}</div>
        `;
        
        switch (value) {
          case 0.1:
            chip.addEventListener('dragstart', dragStart);
            chip.addEventListener('dragend', dragEnd);
            // Apply random translation within the stack
            chip.style.transform = `translateY(-${translateY * tenthCounter}px) translateX(${Math.floor(Math.random() * randomXtranslate) + 1}px) rotate(${randomRotation}deg)`;
            tenthCounter++;
            chip.classList.add('chip-0_1');
            tenthStack.appendChild(chip);
            break;
          case 0.25:
            chip.addEventListener('dragstart', dragStart);
            chip.addEventListener('dragend', dragEnd);
            // Apply random translation within the stack
            chip.style.transform = `translateY(-${translateY * twentyFifthCounter}px) translateX(${Math.floor(Math.random() * 15) + 1}px) rotate(${randomRotation}deg)`;
            twentyFifthCounter++;
            chip.classList.add('chip-0_25');
            twentyFifthStack.appendChild(chip);
            break;
          case 0.5:
            chip.addEventListener('dragstart', dragStart);
            chip.addEventListener('dragend', dragEnd);
            // Apply random translation within the stack
            chip.style.transform = `translateY(-${translateY * fiftiethCounter}px) translateX(${Math.floor(Math.random() * 15) + 1}px) rotate(${randomRotation}deg)`;
            fiftiethCounter++;
            chip.classList.add('chip-0_5');
            fiftiethStack.appendChild(chip);
            break;
          case 1:
            chip.addEventListener('dragstart', dragStart);
            chip.addEventListener('dragend', dragEnd);
            chip.style.transform = `translateY(-${translateY * oneCounter}px) translateX(${Math.floor(Math.random() * randomXtranslate ) + 1}px) rotate(${randomRotation}deg)`;
            oneCounter++;
            chip.classList.add('chip-1');
            oneStack.appendChild(chip);
            break;
          default:
            chip.addEventListener('dragstart', dragStart);
            chip.addEventListener('dragend', dragEnd);
            // Apply random translation within the stack
            chip.style.transform = `translateY(-${translateY * tenthCounter}px) rotate(${randomRotation}deg)`;
            chip.classList.add('chip-default');
            chipsContainer.appendChild(chip);
            break;
        }

        remainingBalance -= value;
        amountDistributed += value;
        console.log("remaining balance: " + remainingBalance);
        console.log("amount distributed: " + amountDistributed);
        if (remainingBalance < value) {
          break; // Exit the loop if remaining balance is less than the current chip value
        }
      }
    }
  } catch (error) {
    console.log(error);
  }
}


// Handles deposits for player
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
// Handles creation of an account for player
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
// Handles bets for the player
const bets = [];
const play = async () => {
  document.body.classList.add('disable-document');
  const rollIndicator = document.getElementById('roll-indicator');
rollIndicator.classList.add('rolling');
  try {
    let totalBetAmounts = calculateTotalBetAmount();
    let totalProfitForRound = 0;
    let netProfitForRound = 0;

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

    if (receipt.events && receipt.events.Result) {
      rollIndicator.classList.remove('rolling');
      rollIndicator.classList.add('active');
      if (Array.isArray(receipt.events.Result)) {
       let target = rollAnimation(receipt.events.Result[0].returnValues[3]);
        unRollAnimation(target);
        receipt.events.Result.forEach((event) => {
          const returns = event.returnValues;
          console.log(`Winning number: ${returns[3]}`);
          totalProfitForRound += parseFloat(web3.utils.fromWei(returns[5]));

          // Check if receipt.events.FeeDistributed exists and is an array
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
        console.log(`Winning number: ${returns[3]}`);
        let target = rollAnimation(returns[3]);
        unRollAnimation(target);
        totalProfitForRound += parseFloat(web3.utils.fromWei(returns[5]));

        // Check if receipt.events.FeeDistributed exists and is an array
        if (receipt.events.FeeDistributed && Array.isArray(receipt.events.FeeDistributed)) {
          const feeEvent = receipt.events.FeeDistributed.find((feeEvent) => feeEvent.blockNumber === receipt.events.Result.blockNumber);
          if (feeEvent) {
            const feeReturns = feeEvent.returnValues;
            const unixTimestamp = parseInt(feeReturns[1]) * 1000;
            const date = new Date(unixTimestamp);
            const formattedDate = date.toLocaleString();
            const amountInMatic = web3.utils.fromWei(feeReturns[0]);
          }
        }
      }

      let totalBetAmountsInMatic = parseFloat(web3.utils.fromWei(totalBetAmounts.toString()));

      if (totalBetAmountsInMatic > totalProfitForRound) {
        netProfitForRound = totalBetAmountsInMatic - totalProfitForRound;

        setTimeout(() => { lossAnimation(netProfitForRound)}, 5500);
      } else if (totalBetAmountsInMatic < totalProfitForRound) {
        netProfitForRound = totalProfitForRound - totalBetAmountsInMatic;
        setTimeout(() => {winAnimation(netProfitForRound)}, 5550);
      } else {
        setTimeout(() => {breakEvenAnimation()}, 5550);
      }

    } else {
      console.log("No Result event found in the receipt.");
      throw new Error("No Result event found in the receipt.");
    }
    // Remove chips from the DOM
    setTimeout(() => {
      const boards = document.querySelectorAll('.betting-board');
    boards.forEach(board => {
      const chips = board.querySelectorAll('.placed');
      chips.forEach(chip => chip.remove());
    });
    document.body.classList.remove('disable-document');

    }, 10000);
    bets.length = 0;
    let updatedTotalBetAmount = calculateTotalBetAmount();
    let updatedTotalBetAmountInMatic = parseFloat(web3.utils.fromWei(updatedTotalBetAmount.toString()));
    setTimeout(() => {
      updateStats();
      updateBetDisplay(updatedTotalBetAmountInMatic);
      updateColorMapping();
      fetchAndUpdateConsecutiveWins();
    }, 8500);
  } catch (error) {
    console.error("Error placing bets:", error);
    alert("Error placing bets: " + error.message);
    rollIndicator.classList.remove('rolling');
    document.body.classList.remove('disable-document');
    // Remove chips from the DOM
    const boards = document.querySelectorAll('.betting-board');
    boards.forEach(board => {
      const chips = board.querySelectorAll('.placed');
      chips.forEach(chip => chip.remove());
    });
    bets.length = 0;
    updateStats();
    setTimeout(() => {
      totalBetAmount.textContent = 0;
    }, 150);
  }
};
playButton.addEventListener("click", play);
// Handles update the UI stats 
const updateStats = async () => {
  try {
    const balanceValue = await contract.methods.getBalance().call({ from: userAccount });
    const balanceInMatic = web3.utils.fromWei(balanceValue);
    const roundValue = await contract.methods.getCurrentRound().call({ from: userAccount });
    let sliceAmount = balanceInMatic > 0 && balanceInMatic < 10 ? 4 : balanceInMatic < 100 ? 5 : balanceInMatic < 1000 ? 6 : balanceInMatic < 10000 ? 7 : 0; 
    balance.textContent = balanceInMatic.slice(0, sliceAmount);
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
// CHIP FUNCTIONALITY
const chips = document.querySelectorAll('.chip');
chips.forEach(chip => {
  chip.addEventListener('dragstart', dragStart);
  chip.addEventListener('dragend', dragEnd);
});
function dragStart() {
  this.classList.add('dragging');
  const chipValue = parseFloat(this.getAttribute('data-value'));
  const remainingBalance = parseFloat(balance.textContent);
  if (chipValue > remainingBalance) {
    console.log(`Chip value ${chipValue} exceeds remaining balance ${remainingBalance}. Disabling chip.`);
    // Disable the chip
    this.classList.add('disabled');
    this.setAttribute('draggable', 'false'); // Disable dragging
    this.removeEventListener('dragstart', dragStart); // Remove dragstart listener
    this.removeEventListener('dragend', dragEnd); // Remove dragend listener
    // Store the chip value when disabling it
    this.dataset.disabledValue = chipValue;
    this.classList.remove('dragging');
    return; // Exit early if chip value exceeds balance
  }
}
function dragEnd() {
  this.classList.remove('dragging');
}
const removeChip = (chip, value, boardValue) => {
  // Calculate remaining balance after removing the chip
  const remainingBalance = parseFloat(balance.textContent) + parseFloat(chip.getAttribute('data-value'));
  // Enable chips if balance allows
  document.querySelectorAll('.disabled').forEach(disabledChip => {
    const chipValue = parseFloat(disabledChip.getAttribute('data-value'));
    if (remainingBalance >= chipValue) {
      disabledChip.classList.remove('disabled');
      disabledChip.setAttribute('draggable', 'true');
      disabledChip.addEventListener('dragstart', dragStart);
      disabledChip.addEventListener('dragend', dragEnd);
      console.log(`Chip with a value of ${chipValue} has been enabled.`);
    }
  });
  chip.remove();
  decreaseAnimation();
  // Convert value to Wei
  const valueInWei = web3.utils.toWei(value.toString(), 'ether');
  const guess = parseInt(boardValue <= 6 ? boardValue : boardValue == 7 ? 1 : boardValue == 8 ? 2 : boardValue == 9 ? 1 : 2);
  // Remove the bet from the bets array
  const index = bets.findIndex(bet => bet.amount == valueInWei && bet.guess == guess);
  if (index !== -1) {
    bets.splice(index, 1);
    console.log(`${value} removed from ${boardValue}`);
    console.log(`Number of remaining bets: ${bets.length}`);
    bets.forEach(bet => console.log(bet)); // Log remaining bets for debugging
  } else {
    console.log(`No matching bet found for removal: ${valueInWei}, ${boardValue}`);
  }
  balance.textContent = `${remainingBalance}`;
  updateBetDisplay(calculateTotalBetAmount());
};

// BOARD FUNCTIONALITY
const boards = document.querySelectorAll('.betting-board');
boards.forEach(board => {
  board.addEventListener('dragover', dragOver);
  board.addEventListener('dragenter', dragEnter);
  board.addEventListener('dragleave', dragLeave);
  board.addEventListener('drop', dragDrop);
});
function dragOver(e) {
  e.preventDefault();
}
function dragEnter(e) {
  e.preventDefault();
  this.classList.add('hovered');
}
function dragLeave() {
  this.classList.remove('hovered');
}
function dragDrop(e) {
  e.preventDefault();
  this.classList.remove('hovered');
  if(bets.length >= 10) {
    alert("Maximum ten bets allowed.");
    return 1;
  }
  const chip = document.querySelector('.dragging');
  if (chip) {
    const boardValue = parseInt(this.getAttribute('data-value'));
    const chipValue = parseFloat(chip.getAttribute('data-value'));
    // Calculate absolute position for new chip
    const rect = this.getBoundingClientRect(); // Get position of the target element
    const offsetX = e.clientX - rect.left; // Calculate X position relative to target
    const offsetY = e.clientY - rect.top;  // Calculate Y position relative to target
    // Check if dropping this chip will exceed the current balance
    const remainingBalance = parseFloat(balance.textContent);
    const newChip = chip.cloneNode(true);
    newChip.classList.remove('dragging');
    newChip.classList.add('placed');
    newChip.style.position = 'absolute';
    newChip.style.top = `${offsetY}px`;
    newChip.style.left = `${offsetX}px`;
    setTimeout(() => {
       // Generate a random rotation angle (example: 0, 45, or 90 degrees)
      const randomAngle = Math.floor(Math.random() * 3) * 45; // Generates 0, 45, or 90
      // Apply the random keyframes animation to your element
      newChip.style.animation = `rotate-${randomAngle} .2s ease-in-out forwards`;
    }, 332)
    // Generate a random rotation angle (example: 0, 45, or 90 degrees)
    // Remove draggable attribute and add click event listener to remove the chip
    newChip.removeAttribute('draggable');
    newChip.addEventListener('click', () => {
      removeChip(newChip, chipValue, boardValue);
    });
    // Append the chip to the drop target (this)
    this.appendChild(newChip);
    // Add bet information to your bets array
    let betType = boardValue < 7 ? 0 : boardValue < 9 ? 1 : 2;
    const colorBet = this.classList.contains('black') ? 2 : 1;
    let valueInWei = web3.utils.toWei(chipValue.toString(), 'ether');
    let stringWei = valueInWei.toString();
    const newBetObj = {
      amount: stringWei,
      betType,
      guess: boardValue <= 6 ? boardValue : boardValue === 7 ? 1 : boardValue === 8 ? 2 : boardValue === 9 ? 1 : 2
    };
    bets.push(newBetObj);
    console.log(`${stringWei} matic placed on ${boardValue <= 6 ? boardValue : boardValue === 7 ? 'odd' : boardValue === 8 ? 'even' : boardValue === 9 ? 'red' : 'black'} with bet type ${betType == 0 ? 'number' : betType == 1 ? 'parity' : 'color'}`);
    // Calculate and display total bet amount
    let totalBetAmount = calculateTotalBetAmount();
    updateBetDisplay(totalBetAmount);
    increaseAnimation();
    // Log the number of bets for debugging purposes
    console.log(`Number of bets: ${bets.length}`);
  }
}
const calculateTotalBetAmount = () => {
  return bets.reduce((total, bet) => total.add(web3.utils.toBN(bet.amount)), web3.utils.toBN('0'));
};
// ANIMATIONS
const winAnimation = (amountWon) => {
  const rollIndicator = document.getElementById('roll-indicator');
  rollIndicator.classList.remove('active');
  var duration = 2 * 1000;
  var end = Date.now() + duration;
  let winMessage =  document.getElementById('winMessage')
  winMessage.textContent = `WINNER! +${amountWon.toFixed(2)} MATIC`;
  winMessage.classList.add('show');
  setTimeout(() => {
    document.getElementById('winMessage').classList.remove('show');
  }, 2000);
  // Randomly generate confetti with various colors and angles
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
const lossAnimation = (amountLost) => {
  const rollIndicator = document.getElementById('roll-indicator');
  rollIndicator.classList.remove('active');
  document.getElementById('lossParticles').classList.remove('hidden');
  let lossMessage = document.getElementById('loseMessage');
  lossMessage.textContent = `YOU LOSE -${amountLost.toFixed(2)} MATIC`;
  lossMessage.classList.add('show');
  particlesJS('lossParticles', {
    particles: {
      number: { value: 50 },
      color: { value: '#ff0000' }, // Red color for particles
      shape: {
        type: 'circle', // Use circles instead of an image
      },
      opacity: { value: 0.8 },
      size: { value: 10, random: true },
      move: {
        direction: 'bottom', // Move particles downwards
        speed: 5,
        out_mode: 'out', // Remove particles when they go out of canvas
      },
      line_linked: { enable: false }, // No links between particles
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
  // Hide particles and message after animation
  setTimeout(() => {
    document.getElementById('lossParticles').classList.add('hidden');
    lossMessage.classList.remove('show');
  }, 2000); // Duration of the particle effect and message
}
const breakEvenAnimation = () => {
  const rollIndicator = document.getElementById('roll-indicator');
  rollIndicator.classList.remove('active');
  document.getElementById('breakEven').classList.remove('hidden');
  let lossMessage = document.getElementById('breakEvenMessage');
  lossMessage.textContent = `Break Even`;
  lossMessage.classList.add('show');
  particlesJS('breakEven', {
    particles: {
      number: { value: 50 },
      color: { value: '#ffffff' }, // Red color for particles
      shape: {
        type: 'circle', // Use circles instead of an image
      },
      opacity: { value: 0.8 },
      size: { value: 10, random: true },
      move: {
        direction: 'none', // Move particles downwards
        speed: 5,
        random: true,
        out_mode: 'out', // Remove particles when they go out of canvas
      },
      line_linked: { enable: false }, // No links between particles
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
  }, 2000);
}
const rollAnimation = (winningNumber) =>  {
  const bettingBoard = document.querySelectorAll('.betting-board');
  const numberedBoards = document.querySelectorAll('.numbered-board');
  const carousel = document.querySelector('.carousel');
  const carouselHeight = 55; // Adjust to match your .carousel-number height
  const targetOffset = -(winningNumber) * carouselHeight; // Calculate offset based on winningNumber
  // Animate the carousel to the target number
  carousel.style.transform = `translateY(${targetOffset}px)`;
  setTimeout(() => {
    numberedBoards.forEach(board => {
      if (board.getAttribute('data-value') === winningNumber) {
        if(board.classList.contains('red')){
          bettingBoard[9].style.boxShadow = '1px 1px 1px 5px gold';
        } else if(board.classList.contains('black')) {
          bettingBoard[8].style.boxShadow = '1px 1px 1px 5px gold';
        }
        if(winningNumber % 2 == 0 ) {
          bettingBoard[0].style.boxShadow = '1px 1px 1px 5px gold';
        } else if (winningNumber % 2 !== 0) {
          bettingBoard[1].style.boxShadow = '1px 1px 1px 5px gold';
        }
      board.classList.add('active');
    }
          })
  }, 2500)
  return targetOffset;
}
const unRollAnimation = (target) =>  {
  const bettingBoard = document.querySelectorAll('.betting-board');
  const numberedBoards = document.querySelectorAll('.numbered-board');
  const carousel = document.querySelector('.carousel');
  console.log("Unroll started.");
  setTimeout(() => {
    numberedBoards.forEach(board => {
      board.classList.remove('active');
          })
          bettingBoard.forEach(board => {
            board.classList.remove('active');
            board.style.boxShadow = '';
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
// Huge problem in fetching number history for the first round of ebery batch... it shows the second rounds number 