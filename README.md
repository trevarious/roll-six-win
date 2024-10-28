# RollSixWin DApp 🎲

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Solidity](https://img.shields.io/badge/solidity-%5E0.8.19-lightgrey)

> A decentralized betting game powered by Chainlink VRF where players can bet on dice rolls with provably fair outcomes.

## 📝 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Game Mechanics](#game-mechanics)
- [Getting Started](#getting-started)
- [Technical Details](#technical-details)
- [Security](#security)
- [Examples](#examples)
- [Events](#events)
- [Support](#support)

## 🎮 Overview

RollSixWin is a sophisticated blockchain-based betting platform that offers multiple betting options on dice rolls. Using Chainlink's VRF (Verifiable Random Function), the game ensures completely fair and transparent results while providing an engaging gaming experience.

## ✨ Features

### Core Gaming Features
- 🎲 Multiple bet types with different odds and payouts
- 🎨 Dynamic color mapping system
- 🔒 Provably fair random number generation
- 🏆 Streaks bonus system
- ⚡ Real-time results and instant payouts

### Player Features
- 👤 Account creation system
- 💰 Deposit and withdrawal functionality
- 📊 Comprehensive statistics tracking
- 📜 Winning number history
- 💳 Real-time balance updates
- 🌟 Consecutive wins tracking

## 🎯 Game Mechanics

### Betting Types & Payouts

```plaintext
1. Number Bets (6x Payout)
   └─ Guess exact number (1-6)

2. Parity Bets (2x Payout)
   ├─ Odd (1,3,5)
   └─ Even (2,4,6)

3. Color Bets (2x Payout)
   ├─ Color 1
   └─ Color 2
```

### Streaks Bonus System

```plaintext
Number Bets:
2-5 wins → 100% bonus
6+  wins → 500% bonus

Parity/Color Bets:
2-3 wins → 100% bonus
4-5 wins → 200% bonus
6-7 wins → 300% bonus
8-9 wins → 400% bonus
10+ wins → 500% bonus
```

## 🚀 Getting Started

### Prerequisites

```plaintext
- MetaMask or compatible Web3 wallet
- Network tokens for betting and gas
- Minimum balance: 0.01 ETH
```

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/rollsixwin-dapp.git
cd rollsixwin-dapp
```

2. Install dependencies
```bash
npm install
```

3. Configure environment
```bash
cp .env.example .env
# Edit .env with your values
```

4. Start development server
```bash
npm run dev
```

### Smart Contract Interaction

#### Creating an Account
```javascript
const rollSixWin = await ethers.getContractAt("RollSixWin", CONTRACT_ADDRESS);
await rollSixWin.createAccount();
```

#### Depositing Funds
```javascript
await rollSixWin.deposit({ value: ethers.parseEther("1.0") });
```

#### Placing Bets
```javascript
const bets = [
  {
    amount: ethers.parseEther("0.1"),
    betType: 0, // Number bet
    guess: 6
  },
  {
    amount: ethers.parseEther("0.1"),
    betType: 1, // Parity bet
    guess: 1    // Odd
  }
];

await rollSixWin.play(bets);
```

#### Checking Results
```javascript
const history = await rollSixWin.getWinningNumberHistory();
const stats = await rollSixWin.getPlayerStatistics();
const balance = await rollSixWin.getBalance();
```

#### Withdrawing Funds
```javascript
await rollSixWin.withdraw(ethers.parseEther("1.0"));
```

## 🔧 Technical Details

### Smart Contract Architecture

```plaintext
RollSixWin
├─ VRFConsumerBaseV2Plus
└─ VRFV2PlusClient
```

### Key Parameters

```javascript
COOLDOWN_PERIOD = 3 minutes
FEE_RANGE = 300-1500 basis points (3-15%)
MAX_BET = 1 ETH (configurable)
MIN_BET = 0.01 ETH (configurable)
MIN_BALANCE_FOR_BATCH = 3 ETH
```

## 🔒 Security

### Built-in Protections

- ⏲️ Transfer cooldowns (3 minutes)
- 💰 Bet limits (min/max)
- 🛡️ Anti-spam measures
- 🚫 Player banning system
- 📊 Automated fee collection

### Best Practices

```solidity
// Example of security checks
modifier onlyActivePlayer() {
    require(!isBanned(players[msg.sender]), "Only active player can call this.");
    _;
}

// Cooldown implementation
require(
    block.timestamp >= timeSinceLastDeposit[msg.sender] + TRANSFER_COOLDOWN_PERIOD,
    "You may deposit once every three minutes."
);
```

## 📡 Events

```solidity
event BetPlaced(
    address indexed player,
    uint256 betAmount,
    BetType betType,
    uint8 guess
);

event Result(
    address indexed player,
    BetType betType,
    uint8 guess,
    uint8 winningNumber,
    bool winner,
    uint256 amountWon
);

event DepositComplete(
    address indexed player,
    uint256 amount,
    uint256 timestamp
);

// ... and more
```

## 🤝 Support

For support and inquiries:

- 📧 Email: support@rollsixwin.com
- 💬 Discord: [Join our server](https://discord.gg/rollsixwin)
- 🐦 Twitter: [@RollSixWin](https://twitter.com/rollsixwin)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

> Built with ❤️ by the RollSixWin Team