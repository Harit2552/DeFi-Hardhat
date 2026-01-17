# DeFi-Hardhat

A decentralized finance (DeFi) project built using **Hardhat** that demonstrates core DeFi operations such as **depositing collateral, borrowing assets, and repaying loans** on Ethereum-compatible networks.

---

## 📌 Project Overview

This repository is a hands-on DeFi project focused on understanding how decentralized finance protocols work internally. It showcases how smart contracts interact with lending and borrowing mechanisms using Hardhat as the development environment.

The project includes:
- Solidity smart contracts
- Hardhat scripts for DeFi operations
- Automated testing
- Optional frontend integration for interaction

---

## 🛠 Tech Stack

- **Solidity** – Smart contract development  
- **Hardhat** – Ethereum development framework  
- **JavaScript** – Scripts and tests  
- **Ethers.js** – Blockchain interaction  
- **Node.js** – Runtime environment  

---

## 📁 Project Structure

```
DeFi-Hardhat/
│
├── contracts/        # Solidity smart contracts
├── scripts/          # Deployment & interaction scripts
├── test/             # Hardhat tests
├── frontend/         # Frontend UI 
├── hardhat.config.js # Hardhat configuration
├── package.json      # Project dependencies
└── README.md
```

---

## ⚙️ Installation & Setup

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/Harit2552/DeFi-Hardhat.git
cd DeFi-Hardhat
```

### 2️⃣ Install Dependencies

```bash
npm install
```

### 3️⃣ Environment Variables 

Create a `.env` file in the root directory:

```env
PRIVATE_KEY=your_wallet_private_key
RPC_URL=your_rpc_provider_url
```

---

## 🚀 Hardhat Commands

### Compile Smart Contracts

```bash
npx hardhat compile
```

### Start Local Hardhat Blockchain

```bash
npx hardhat node
```

### Deploy / Run Scripts

```bash
npx hardhat run scripts/deploy.js --network localhost
```
---

## 🧪 Running Tests

Execute all tests using:

```bash
npx hardhat test
```

Tests validate contract behavior such as deposits, borrowing logic, and repayments.

---

## 🌐 Frontend 

```bash
cd frontend
npm install
npm start
```

The frontend allows users to interact with deployed smart contracts through a UI.

---

## 📘 Learning Objectives

- Understand DeFi protocol mechanics
- Learn Hardhat scripting and testing
- Interact with smart contracts using Ethers.js
- Practice Solidity smart contract development

---

## 🤝 Contributing

Contributions are welcome.  
Feel free to open issues or submit pull requests for improvements.

---

## ⭐ Author

**Harit Choudhary**
