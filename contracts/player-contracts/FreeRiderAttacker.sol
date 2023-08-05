pragma solidity =0.6.6;

import '@uniswap/v2-core/contracts/interfaces/IUniswapV2Callee.sol';
import "../DamnValuableNFT.sol";
import "../free-rider/FreeRiderNFTMarketplace.sol";
import "@openzeppelin/contracts/token";

contract FreeRiderAttacker is IUniswapV2Callee {
    FreeRiderNFTMarketplace private target;
    DamnValuableNFT private damnValuableNFT;

    constructor(FreeRiderNFTMarketplace _target, DamnValuableNFT damnValuableNFTAddress, address weth) public {
        target = _target;
        damnValuableNFT = damnValuableNFTAddress;
    }

    function uniswapV2Call(address sender, uint amount0, uint amount1, bytes calldata data) external override {
        address token0 = IUniswapV2Pair(msg.sender).token0();
        address token1 = IUniswapV2Pair(msg.sender).token1();
        assert(msg.sender == UniswapV2Library.pairFor(factory, token0, token1));
    }

    receive() external payable {}
}