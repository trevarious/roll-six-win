 /*
      TODO 07/17/24: 
        - Chip update when bet takes place, top when lose chips, bottom when uou iwn chips 
        - Top off chips when a bet take place, keep the chips ouu win and idscard the chips you lse 
  */
import { contractABI } from './abi.js';
import { contractAddress } from './address.js'; 

let web3;
let contract;
let userAccount;

const createAccountButton = document.getElementById("account-button");
const depositButton = document.getElementById("deposit-button");
const withdrawButton = document.getElementById("withdraw-button");
const connectWalletButton = document.getElementById("connect-wallet-button");
const playButton = document.getElementById("place-bet-button");
const rollIndicator = document.getElementById("roll-indicator") 
const balance = document.getElementById("balance");
const round = document.getElementById("round");
const numberedBoards = document.querySelectorAll(".numbered-board");

let tenthCounter = 0;
let twentyFifthCounter = 0;
let fiftiethCounter = 0;
let oneCounter = 0;
document.addEventListener('DOMContentLoaded', () => {
  playButton.classList.add("hidden");
});

const initialize = async () => {
  if (window.ethereum) {
    let response = prompt("Would you like to sign in with MetaMask?");
    const yesRegex = /^y[a-z]*$/i;
    const noRegex = /^n[a-z]*$/i;
    if(yesRegex.test(response.trim()))  {
      try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        userAccount = accounts[0];
        web3 = new Web3(window.ethereum);
        contract = new web3.eth.Contract(contractABI, contractAddress);
        connectWalletButton.disabled = true;
        const timestamp = new Date().toLocaleString();
        console.log(`Log in successful at ${timestamp}`);
        const accountConnectionIndicator = document.getElementById("log-status-indicator");
        accountConnectionIndicator.classList.add("logged-in");
        rollIndicator.classList.add("logged-in");
        rollIndicator.textContent = "Welcome";
        setTimeout(() => { 
          rollIndicator.classList.remove("logged-in"); 
          rollIndicator.textContent = ""; 
        }, 3000);
        updateAccountDisplay();
        let totalBetAmount = calculateTotalBetAmount();
        updateBetDisplay(totalBetAmount);
        updateColorMapping();
        updateConsecutiveWins();
        dealChips();
        const canvasElements = document.querySelector(".dice-canvas");
        canvasElements.style.opacity = "1";
        setTimeout(() => {
          canvasElements.style.opacity = "";
        }, 3000);
            } catch (error) {
        console.log(error);
        alert("There was an error connecting wallet");
      }
    } else if(noRegex.test(response.trim()))  {
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
const updateAccountDisplay = async () => {
  try {
    const isAccountCreated = await contract.methods.getAccountStatus(userAccount).call({ from: userAccount });
    if(isAccountCreated) {
      const balanceValue = await contract.methods.getBalance().call({from: userAccount});
      const balanceInMatic = web3.utils.fromWei(balanceValue);
      const roundValue = await contract.methods.getCurrentRound().call({from: userAccount});
      depositButton.classList.add("active");
      withdrawButton.classList.add("active");
      createAccountButton.style.display = "none";
      connectWalletButton.style.display = "none";
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
  try {
    let currentBalance = await fetchBalance();
    let roundNumber = await fetchRoundNumber();
    if(roundNumber !== parseInt(round.textContent)) {
      round.textContent = roundNumber;
    }
    let betAmountInMatic = web3.utils.fromWei(totalBetAmount.toString());
    if (currentBalance !== null) {
      let remainingBalance = currentBalance - betAmountInMatic; 
      const balanceElement = document.getElementById('balance'); 
      if (parseFloat(balanceElement.textContent) !== currentBalance) {
        balanceElement.textContent = remainingBalance.toFixed(2); 
      }
      const totalBetElement = document.getElementById('totalBetAmount');
      if (totalBetElement) {
        totalBetElement.classList.add('hidden2'); 
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
        }, 150);
      }
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
        const result = await contract.methods.getConsecutiveWins().call({from: userAccount});
        return result;
    } catch (error) {
        console.error('Error fetching consecutive wins:', error);
    }
}
const updateConsecutiveWins = async () => {
  try {
    const result = await contract.methods.getConsecutiveWins().call({from: userAccount});
    console.log("updateConsecutiveWins:  " +result);
    updateBoardMultiplier('.number-streaks',result[0]);
    updateBoardMultiplier('.parity-streaks',result[1]);
    updateBoardMultiplier('.color-streaks',result[2]);
} catch (error) {
    console.error('Error fetching consecutive wins:', error);
}

}
const updateBoardMultiplier = (elementclass,multipliedAmount) => {
  const elementToModify = document.querySelectorAll(elementclass);
  elementToModify.forEach(element => {
        element.classList.remove('active-light');
        element.textContent = '';
  });
  elementToModify.forEach(element => {
    let amountToLight = multipliedAmount > 0 ? multipliedAmount - 1 : multipliedAmount -1;
    let anotherLight = multipliedAmount > 0 ? multipliedAmount - 1 : multipliedAmount -1;
    const lightContainer = document.createElement('div');
    lightContainer.classList.add('light-container');
    if(elementclass == '.parity-streaks' || elementclass == '.color-streaks'){ 
      for(let i = 0; i < 10; i++) {
        const light = document.createElement('div');
        light.classList.add('light');
        if(amountToLight > 0) {
          light.classList.add('active-light');
          amountToLight--;
        }
        if (anotherLight > -1) {
          light.textContent = `${i < 3 ? '1x' : i < 5 ? '2x' : i < 7 ? '3x' : i < 9 ? '4x' : '5x'}`;
          anotherLight--;
          if(!light.classList.contains('active-light')){
            light.classList.add('scale');
            light.style.scale = '1.2';
          }
        }
        lightContainer.appendChild(light);
      }
      if(element.id == 'red-board') {
        lightContainer.style.alignItems = 'flex-end';
        lightContainer.style.left = '-5px';
      }
      if(element.id == 'odd-board') {
        lightContainer.style.alignItems = 'flex-end';
        lightContainer.style.left = '-5px';
      }
      element.appendChild(lightContainer);
    }
  })
}

const dealChips = async () => {
  const chipsContainer = document.getElementById('chips');
  const tenthStack = document.getElementById('chip0_1');
  const twentyFifthStack = document.getElementById('chip0_25');
  const fiftiethStack = document.getElementById('chip0_5');
  const oneStack = document.getElementById('chip1_0');
  const chipValues = [1, 0.5, 0.25, 0.1]; 
  let amountDistributed = 0;
  let amountToDistribute = 0;
  let chipCounter = 0; 
  try {
    const balanceValue = await contract.methods.getBalance().call({ from: userAccount });
    const balanceInMatic = web3.utils.fromWei(balanceValue);
    amountToDistribute = parseFloat(balanceInMatic); 

    while (amountToDistribute >= amountDistributed && chipCounter < 100) {
      for (let i = 0; i < chipValues.length; i++) {
        const value = chipValues[i];
        if (amountToDistribute < value) {
          continue; // Skip if value is greater than remaining balance
        }

        if (chipCounter >= 100) {
          break; // Exit the loop if 100 chips have been created
        }

        let randomYTranslate = Math.floor(Math.random() * 61) - 10;
        let randomXtranslate = Math.floor(Math.random() * 61) - 30;
        let randomRotation = Math.floor(Math.random() * 45);
        
        const chip = document.createElement('div');
        chip.className = 'chip';
        chip.setAttribute('draggable', 'true');
        chip.setAttribute('data-value', value);
        chip.innerHTML = `
          <div class="center-circle ${value == 0.1 ? 'tenth' : value == 0.25 ? 'twentyFifth' : value == 0.5 ? 'fiftieth' : value == 1 ? 'one' : ''}"></div>
          <div class="center-circle value">${value}</div>
          <div class="l-axis ${value == 0.1 ? 'tenth' : value == 0.25 ? 'twentyFifth' : value == 0.5 ? 'fiftieth' : value == 1 ? 'one' : ''}"></div>
          <div class="lh-axis ${value == 0.1 ? 'tenth' : value == 0.25 ? 'twentyFifth' : value == 0.5 ? 'fiftieth' : value == 1 ? 'one' : ''}"></div>
          <div class="r-axis ${value == 0.1 ? 'tenth' : value == 0.25 ? 'twentyFifth' : value == 0.5 ? 'fiftieth' : value == 1 ? 'one' : ''}"></div>
          <div class="rh-axis ${value == 0.1 ? 'tenth' : value == 0.25 ? 'twentyFifth' : value == 0.5 ? 'fiftieth' : value == 1 ? 'one' : ''}"></div>
          <div class="t-axis ${value == 0.1 ? 'tenth' : value == 0.25 ? 'twentyFifth' : value == 0.5 ? 'fiftieth' : value == 1 ? 'one' : ''}"></div>
          <div class="th-axis ${value == 0.1 ? 'tenth' : value == 0.25 ? 'twentyFifth' : value == 0.5 ? 'fiftieth' : value == 1 ? 'one' : ''}"></div>
          <div class="b-axis ${value == 0.1 ? 'tenth' : value == 0.25 ? 'twentyFifth' : value == 0.5 ? 'fiftieth' : value == 1 ? 'one' : ''}"></div>
          <div class="bh-axis ${value == 0.1 ? 'tenth' : value == 0.25 ? 'twentyFifth' : value == 0.5 ? 'fiftieth' : value == 1 ? 'one' : ''}"></div>
        `;
        
        chip.addEventListener('dragstart', dragStart);
        chip.addEventListener('dragend', dragEnd);
        chip.style.transform = `translateY(${randomYTranslate}px) translateX(${Math.floor(Math.random() * randomXtranslate) + 1}px) rotate(${randomRotation}deg)`;
        
        switch (value) {
          case 0.1:
            tenthCounter++;
            chip.classList.add('chip-0_1');
            tenthStack.appendChild(chip);
            break;
          case 0.25:
            chip.addEventListener('dragstart', dragStart);
            chip.addEventListener('dragend', dragEnd);
            chip.style.transform = `translateY(${randomYTranslate}px) translateX(${Math.floor(Math.random() * randomXtranslate) + 1}px) rotate(${randomRotation}deg)`;
            twentyFifthCounter++;
            chip.classList.add('chip-0_25');
            twentyFifthStack.appendChild(chip);
            break;
          case 0.5:
            chip.addEventListener('dragstart', dragStart);
            chip.addEventListener('dragend', dragEnd);
            chip.style.transform = `translateY(${randomYTranslate}px) translateX(${Math.floor(Math.random() * randomXtranslate) + 1}px) rotate(${randomRotation}deg)`;
            fiftiethCounter++;
            chip.classList.add('chip-0_5');
            fiftiethStack.appendChild(chip);
            break;
          case 1:
            chip.addEventListener('dragstart', dragStart);
            chip.addEventListener('dragend', dragEnd);
            chip.style.transform = `translateY(${randomYTranslate}px) translateX(${Math.floor(Math.random() * randomXtranslate ) + 1}px) rotate(${randomRotation}deg)`;
            oneCounter++;
            chip.classList.add('chip-1');
            oneStack.appendChild(chip);
            break;
          default:
            chip.addEventListener('dragstart', dragStart);
            chip.addEventListener('dragend', dragEnd);
            chip.style.transform = `translateY(${randomYTranslate}px) rotate(${randomRotation}deg)`;
            chip.classList.add('chip-default');
            chipsContainer.appendChild(chip);
            break;
        }
        amountDistributed += value;
        chipCounter++;

        if (amountToDistribute < value) {
          break; // Exit the for loop if remaining balance is less than chip value
        }
      }
    }
  } catch (error) {
    console.log(error);
  }
};
const clearChips = () => {
  const chip01 =document.getElementById('chip0_1');
  const chip25 =document.getElementById('chip0_25');
  const chip50 =document.getElementById('chip0_5');
  const chip1 =document.getElementById('chip1_0');
  while (chip01.firstChild) {
    chip01.removeChild(chip01.firstChild);
  }
  while (chip25.firstChild) {
    chip25.removeChild(chip25.firstChild);
  }
  while (chip50.firstChild) {
    chip50.removeChild(chip50.firstChild);
  }
  while (chip1.firstChild) {
    chip1.removeChild(chip1.firstChild);
  }
};
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
      const receipt = await contract.methods.eject().send({from: userAccount});
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

const bets = [];
const play = async () => {
  playButton.classList.add('clicked');
  setTimeout(() => {
    playButton.classList.remove('clicked');
  },500)
  setTimeout(() => {
    playButton.classList.remove("active");
  },1000)
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
    const canvasElements = document.querySelector('.dice-canvas');
    canvasElements.classList.add('active');
    var randomNumber = Math.floor(Math.random() * (450 - (-450) + 1)) + (-450);
    canvasElements.style.right = `${randomNumber}px`;
    if (receipt.events && receipt.events.Result) {
      if(receipt.events.BonusPaid) {
        if(Array.isArray(receipt.events.BonusPaid)) {
          for(let i = 0; i < receipt.events.BonusPaid.length; i ++) {
            bonuses += parseFloat(web3.utils.fromWei(receipt.events.BonusPaid[i].returnValues[2]));
          }
          console.log(`Bonus paid: ${bonuses}`);
        } else {
          bonuses += parseFloat(web3.utils.fromWei(receipt.events.BonusPaid.returnValues[2]));
          console.log(`Bonus paid: ${bonuses}`);
        }
      } else {
        console.log('no bonuses to pay');
      }
      rollIndicator.classList.remove('rolling');
      rollIndicator.classList.add('active');
      if (Array.isArray(receipt.events.Result)) {
          let intervalId = setInterval(() => {
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
          lossAnimation(netProfitForRound);
        }, 5500);
      } else if (totalBetAmountsInMatic < totalProfitForRound) {
        netProfitForRound = totalProfitForRound - totalBetAmountsInMatic;
        setTimeout(() => {
          winAnimation(netProfitForRound);
        }, 5500);
      } else {
        setTimeout(() => {
          breakEvenAnimation();
        }, 5500);
      }
    } else {
      console.log("No Result event found in the receipt.");
      throw new Error("No Result event found in the receipt.");
    }
    setTimeout(() => {
      const boards = document.querySelectorAll('.betting-board');
      boards.forEach(board => {
        if (!board.isWin) {
          const chips = board.querySelectorAll('.placed');
          chips.forEach(chip => {
            chip.style.transition = 'top 3s ease'; // Change transition to top property
            chip.style.top = '-1000px'; // Remove !important
            console.log('loser');
          });
        } else {
          const chips = board.querySelectorAll('.placed');
          chips.forEach(chip => {
            chip.style.transition = 'top 3s ease'; // Change transition to top property
            chip.style.top = '1000px'; // Remove !important
            console.log('winner');
          });
        }
        board.classList.remove('winning-board');
        board.isWin = false;
      });

    },8500)
    setTimeout(() => {
    document.body.classList.remove('disable-document');
    canvasElements.classList.remove('active');
    canvasElements.style.right = ``;
    setTimeout(() => {resetScene();}, 850);
    }, 14500);
    bets.length = 0;
    let updatedTotalBetAmount = calculateTotalBetAmount();
    let updatedTotalBetAmountInMatic = parseFloat(web3.utils.fromWei(updatedTotalBetAmount.toString()));
    setTimeout(() => {
      updateBetDisplay(updatedTotalBetAmountInMatic);
      updateColorMapping();
      updateConsecutiveWins();
      clearChips();
      dealChips();
    }, 12000);
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
    dealChips();
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
const chips = document.querySelectorAll('.chip');
chips.forEach(chip => {
  chip.addEventListener('dragstart', dragStart);
  chip.addEventListener('dragend', dragEnd);
});
function dragStart(event) {
  this.classList.add('dragging');
  this.initialX = event.offsetX;
  this.initialY = event.offsetY;
  const chipValue = parseFloat(this.getAttribute('data-value'));
  const remainingBalance = parseFloat(balance.textContent);
  if (chipValue > remainingBalance) {
    console.log(`Chip value ${chipValue} exceeds remaining balance ${remainingBalance}. Disabling chip.`);
    this.classList.add('disabled');
    this.setAttribute('draggable', 'false'); 
    this.removeEventListener('dragstart', dragStart); 
    this.removeEventListener('dragend', dragEnd); 
    this.dataset.disabledValue = chipValue;
    this.classList.remove('dragging');
    return;
  }
}
function dragEnd() {
  this.classList.remove('dragging');
}
const removeChip = (chip, value, boardValue) => {
  const remainingBalance = parseFloat(balance.textContent) + parseFloat(chip.getAttribute('data-value'));
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
  const valueInWei = web3.utils.toWei(value.toString(), 'ether');
  const guess = parseInt(boardValue <= 6 ? boardValue : boardValue == 7 ? 1 : boardValue == 8 ? 2 : boardValue == 9 ? 1 : 2);
  const index = bets.findIndex(bet => bet.amount == valueInWei && bet.guess == guess);
  if (index !== -1) {
    bets.splice(index, 1);
    console.log(`${value} removed from ${boardValue}`);
    console.log(`Number of remaining bets: ${bets.length}`);
    bets.forEach(bet => console.log(bet)); 
  } else {
    console.log(`No matching bet found for removal: ${valueInWei}, ${boardValue}`);
  }
  balance.textContent = `${remainingBalance}`;
  updateBetDisplay(calculateTotalBetAmount());
  let randomYTranslate = Math.floor(Math.random() * 61) - 10;
  let randomXtranslate = Math.floor(Math.random() * 101) - 50;
  let randomRotation = Math.floor(Math.random() * 45);
  switch (value) {
    case 0.1:
      const tenthStack = document.getElementById('chip0_1');
      const newChip0_1 = createChipElement(value);
      newChip0_1.style.transform = `translateY(${randomYTranslate}px) translateX(${Math.floor(Math.random() * randomXtranslate) + 1}px) rotate(${randomRotation}deg)`;
      tenthStack.appendChild(newChip0_1);
      break;
    case 0.25:
      const twentyFifthStack = document.getElementById('chip0_25');
      const newChip0_25 = createChipElement(value);
      newChip0_25.style.transform = `translateY(${randomYTranslate}px) translateX(${Math.floor(Math.random() * randomXtranslate) + 1}px) rotate(${randomRotation}deg)`;
      twentyFifthStack.appendChild(newChip0_25);
      break;
    case 0.5:
      const fiftiethStack = document.getElementById('chip0_5');
      const newChip0_5 = createChipElement(value);
      newChip0_5.style.transform = `translateY(${randomYTranslate}px) translateX(${Math.floor(Math.random() * randomXtranslate) + 1}px) rotate(${randomRotation}deg)`;
      fiftiethStack.appendChild(newChip0_5);
      break;
    case 1:
      const oneStack = document.getElementById('chip1_0');
      const newChip1_0 = createChipElement(value);
      newChip1_0.style.transform = `translateY(${randomYTranslate}px) translateX(${Math.floor(Math.random() * randomXtranslate) + 1}px) rotate(${randomRotation}deg)`;
      oneStack.appendChild(newChip1_0);
      break;
    default:
      console.error(`Could not find chip of that value. Value: ${value}`);
      break;
  }
  if(bets.length <= 0) {
    playButton.classList.remove("active");
  }
};
const createChipElement = (value) => {
  const chip = document.createElement('div');
  chip.className = 'chip';
  chip.setAttribute('draggable', 'true');
  chip.setAttribute('data-value', value);
  chip.classList.add(`${value == 0.1 ? 'chip-0_1' : value == 0.25 ? 'chip-0_25' : value == 0.5 ? 'chip-0_5' : value == 1 ? 'chip-1' : '' }`);
  chip.innerHTML = `
       <div class="center-circle ${value == 0.1 ? 'tenth' : value == 0.25 ? 'twentyFifth' : value == 0.5 ? 'fiftieth' : value == 1 ? 'one' : ''}"></div>
          <div class="center-circle value">${value}</div>
          <div class="l-axis ${value == 0.1 ? 'tenth' : value == 0.25 ? 'twentyFifth' : value == 0.5 ? 'fiftieth' : value == 1 ? 'one' : ''}"></div>
          <div class="lh-axis ${value == 0.1 ? 'tenth' : value == 0.25 ? 'twentyFifth' : value == 0.5 ? 'fiftieth' : value == 1 ? 'one' : ''}"></div>
          <div class="r-axis ${value == 0.1 ? 'tenth' : value == 0.25 ? 'twentyFifth' : value == 0.5 ? 'fiftieth' : value == 1 ? 'one' : ''}"></div>
          <div class="rh-axis ${value == 0.1 ? 'tenth' : value == 0.25 ? 'twentyFifth' : value == 0.5 ? 'fiftieth' : value == 1 ? 'one' : ''}"></div>
          <div class="t-axis ${value == 0.1 ? 'tenth' : value == 0.25 ? 'twentyFifth' : value == 0.5 ? 'fiftieth' : value == 1 ? 'one' : ''}"></div>
          <div class="th-axis ${value == 0.1 ? 'tenth' : value == 0.25 ? 'twentyFifth' : value == 0.5 ? 'fiftieth' : value == 1 ? 'one' : ''}"></div>
          <div class="b-axis ${value == 0.1 ? 'tenth' : value == 0.25 ? 'twentyFifth' : value == 0.5 ? 'fiftieth' : value == 1 ? 'one' : ''}"></div>
          <div class="bh-axis ${value == 0.1 ? 'tenth' : value == 0.25 ? 'twentyFifth' : value == 0.5 ? 'fiftieth' : value == 1 ? 'one' : ''}"></div>
`;
  chip.addEventListener('dragstart', dragStart);
  chip.addEventListener('dragend', dragEnd);
  return chip;
}
const placeChipOnBoard = (chip, board) => {
  chip.classList.remove('dragging');
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
    const rect = this.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;  
    chip.classList.remove('dragging');
    chip.classList.add('placed');
    chip.style.position = 'absolute';
    chip.style.top = `${offsetY}px`;
    chip.style.left = `${offsetX}px`;
    setTimeout(() => {
      const randomAngle = Math.floor(Math.random() * 3) * 45;
      chip.style.animation = `rotate-${randomAngle} .2s ease-in-out forwards`;
    }, 332)
    chip.removeAttribute('draggable');
    chip.addEventListener('click', () => {
      removeChip(chip, chipValue, boardValue);
    });
    const clearBoardButton = document.getElementById("clear-board-button");
    clearBoardButton.addEventListener("click", () => {
      if(bets.length > 0)
      removeChip(chip, chipValue, boardValue);
    })
    this.appendChild(chip);
    let betType = boardValue < 7 ? 0 : boardValue < 9 ? 1 : 2;
    let valueInWei = web3.utils.toWei(chipValue.toString(), 'ether');
    let stringWei = valueInWei.toString();
    const newBetObj = {
      amount: stringWei,
      betType,
      guess: boardValue <= 6 ? boardValue : boardValue === 7 ? 1 : boardValue === 8 ? 2 : boardValue === 9 ? 1 : 2
    };
    bets.push(newBetObj);
    console.log(`${stringWei} matic placed on ${
                  boardValue <= 6 
                  ? boardValue 
                  : boardValue === 7 
                  ? 'odd' 
                  : boardValue === 8 
                  ? 'even' 
                  : boardValue === 9 
                  ? 'red' 
                  : 'black'
                } with bet type ${betType == 0 ? 'number' : betType == 1 ? 'parity' : 'color'}`);
    let totalBetAmount = calculateTotalBetAmount();
    updateBetDisplay(totalBetAmount);
    increaseAnimation();
    console.log(`Number of bets: ${bets.length}`);
  }
  if(bets.length > 0) {
    playButton.classList.add("active");
  }
}
const calculateTotalBetAmount = () => {
  return bets.reduce((total, bet) => total.add(web3.utils.toBN(bet.amount)), web3.utils.toBN('0'));
};



// ANIMATIONS
const winAnimation = (amountWon) => {
  rollIndicator.classList.remove('active');
  var duration = 6 * 1000;
  var end = Date.now() + duration;
  let winMessage =  document.getElementById('winMessage')
  winMessage.textContent = `+${amountWon.toFixed(2)} MATIC`;
  winMessage.classList.add('show');
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
const lossAnimation = (amountLost) => {
  rollIndicator.classList.remove('active');
  document.getElementById('lossParticles').classList.remove('hidden');
  document.getElementById('lossParticles').style.opacity = '0';
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
const breakEvenAnimation = () => {
  rollIndicator.classList.remove('active');
  document.getElementById('breakEven').style.opacity = '0';
  document.getElementById('breakEven').classList.remove('hidden'); 
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
const rollAnimation = async (winningNumber) =>  {
  const consecutiveWins = await fetchConsecutiveWins();
  let multipliedAmountForNumber = consecutiveWins[0] == 3 ? 0.1 : consecutiveWins[0] == 4 || consecutiveWins[0] == 5 ? 0.5 : consecutiveWins[0] >= 6 ? 1 : '';
  let multipliedAmountForParity = consecutiveWins[1] == 1 ? 1 : consecutiveWins[1] == 2 ? 1.5 : consecutiveWins[1] == 3 ? 2 : consecutiveWins[1] == 4 ? 2.5 : consecutiveWins[1] == 5 ? 3 : consecutiveWins[1] == 6 ? 4 : consecutiveWins[1] == 7 ? 5 : consecutiveWins[1] == 8 ? 6 : '';
  let multipliedAmountForColor = consecutiveWins[2] == 1 ? 1 : consecutiveWins[2] == 2 ? 1.5 : consecutiveWins[2] == 3 ? 2 : consecutiveWins[2] == 4 ? 2.5 : consecutiveWins[2] == 5 ? 3 : consecutiveWins[2] == 6 ? 4 : consecutiveWins[2] == 7 ? 5 : consecutiveWins[2] == 8 ? 6 : '';
  const bettingBoard = document.querySelectorAll('.betting-board');
  const numberedBoards = document.querySelectorAll('.numbered-board');
  const carousel = document.querySelector('.carousel');
  const carouselHeight = 55; 
  const targetOffset = -(winningNumber) * carouselHeight;
  let winningChipClone;
  carousel.style.transform = `translateY(${targetOffset}px)`;
  setTimeout(() => {
    numberedBoards.forEach(board => {
      if (board.getAttribute('data-value') === winningNumber) {
        board.isWin = true;
        setTimeout(() => {
          const chipsOnBoard = board.querySelectorAll('.chip');
          chipsOnBoard.forEach(chip => {
            let value = chip.getAttribute('data-value');
            console.log("attribute of chip: " + chip.getAttribute('data-value'));
            for(let i = 0; i < 5; i++) {
              if(multipliedAmountForNumber > 3) {
                for(let i = 0; i < multipliedAmountForNumber; i++){
                  winningChipClone = createChipElement(value);
                  placeChipOnBoard(winningChipClone, board);
                }
              } else {
                winningChipClone = createChipElement(value);
                winningChipClone.style.boxShadow = '15px 15px 60px yellow';
                placeChipOnBoard(winningChipClone, board);
              }
            }
          })
        }, 2000);
        if(board.classList.contains('red')){
          bettingBoard[9].classList.add('winning-board');
          bettingBoard[9].isWin = true;
          setTimeout(() => {
            const chipsOnBoard = bettingBoard[9].querySelectorAll('.chip');
              chipsOnBoard.forEach(chip => {
                if(multipliedAmountForColor > 0) {
                  for(let i = 0; i < multipliedAmountForColor; i++ ){
                  console.log("attribute of chip: " + chip.getAttribute('data-value'));
                  let value = chip.getAttribute('data-value');
                  winningChipClone = createChipElement(value);
                  winningChipClone.style.boxShadow = '15px 15px 60px yellow';
                  placeChipOnBoard(winningChipClone, bettingBoard[9]);
                  }
                } else {
                  console.log("attribute of chip: " + chip.getAttribute('data-value'));
                  let value = chip.getAttribute('data-value');
                  winningChipClone = createChipElement(value);
                  winningChipClone.style.boxShadow = '15px 15px 60px yellow';
                  placeChipOnBoard(winningChipClone, bettingBoard[9]);
                }
              })


            
          }, 2000);
        } else if(board.classList.contains('black')) {
          bettingBoard[8].classList.add('winning-board');
          bettingBoard[8].isWin = true;
          const chipsOnBoard = bettingBoard[8].querySelectorAll('.chip');
          setTimeout(() => {
            chipsOnBoard.forEach(chip => {
              if(multipliedAmountForColor > 0) {
                for(let i = 0; i < multipliedAmountForColor; i++ ){
                console.log("attribute of chip: " + chip.getAttribute('data-value'));
                let value = chip.getAttribute('data-value');
                winningChipClone = createChipElement(value);
                winningChipClone.style.boxShadow = '15px 15px 60px yellow';
                placeChipOnBoard(winningChipClone, bettingBoard[8]);
                }
              } else {
                console.log("attribute of chip: " + chip.getAttribute('data-value'));
                let value = chip.getAttribute('data-value');
                winningChipClone = createChipElement(value);
                winningChipClone.style.boxShadow = '15px 15px 60px yellow';
                placeChipOnBoard(winningChipClone, bettingBoard[8]);
              }
            })
            
          }, 2000);
        }
        if(winningNumber % 2 == 0 ) {
          bettingBoard[0].classList.add('winning-board');
          bettingBoard[0].isWin = true;
          setTimeout(() => {
            const chipsOnBoard = bettingBoard[0].querySelectorAll('.chip');
            chipsOnBoard.forEach(chip => {
              if(multipliedAmountForParity > 0) {
                for(let i = 0; i < multipliedAmountForParity; i++ ){
                console.log("attribute of chip: " + chip.getAttribute('data-value'));
                let value = chip.getAttribute('data-value');
                winningChipClone = createChipElement(value);
                winningChipClone.style.boxShadow = '15px 15px 60px yellow';
                placeChipOnBoard(winningChipClone, bettingBoard[0]);
                }
              } else {
                console.log("attribute of chip: " + chip.getAttribute('data-value'));
                let value = chip.getAttribute('data-value');
                winningChipClone = createChipElement(value);
                winningChipClone.style.boxShadow = '15px 15px 60px yellow';
                placeChipOnBoard(winningChipClone, bettingBoard[0]);
              }
            })
          }, 2000)
        } else if (winningNumber % 2 !== 0) {
          bettingBoard[1].classList.add('winning-board');
          bettingBoard[1].isWin = true;
          setTimeout(() => {
            const chipsOnBoard = bettingBoard[1].querySelectorAll('.chip');
            chipsOnBoard.forEach(chip => {
              if(multipliedAmountForParity > 0) {
                for(let i = 0; i < multipliedAmountForParity; i++ ){
                console.log("attribute of chip: " + chip.getAttribute('data-value'));
                let value = chip.getAttribute('data-value');
                winningChipClone = createChipElement(value);
                winningChipClone.style.boxShadow = '15px 15px 60px yellow';
                placeChipOnBoard(winningChipClone, bettingBoard[1]);
                }
              } else {
                console.log("attribute of chip: " + chip.getAttribute('data-value'));
                let value = chip.getAttribute('data-value');
                winningChipClone = createChipElement(value);
                winningChipClone.style.boxShadow = '15px 15px 60px yellow';
                placeChipOnBoard(winningChipClone, bettingBoard[1]);
              }
            })
          }, 2000 );
        }
      board.classList.add('winning-board');
    }
          })
  }, 2000)
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







// Initialize Three.js components
var canvas = document.createElement('canvas');
canvas.classList.add('dice-canvas');
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(100, window.innerWidth / window.innerHeight, 0.1, 1000);
var renderer = new THREE.WebGLRenderer({ canvas:canvas, alpha: true });
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