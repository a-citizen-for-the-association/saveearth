// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

import { Test } from "forge-std/Test.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { CommunityBoard } from "../src/CommunityBoard.sol";
import { Membership } from "../src/Membership.sol";
import { GovernanceToken } from "../src/GovernanceToken.sol";

contract CommunityBoardTest is Test {
    Membership private membership;
    GovernanceToken private token;
    CommunityBoard private board;

    address private owner = makeAddr("owner");
    address private stranger = makeAddr("stranger");

    function setUp() public {
        // Membership's constructor registers `owner` as its genesis member,
        // so `owner` satisfies `onlyOwnerWhoIsMember` (ADR-0005) by default.
        membership = new Membership(owner);
        token = new GovernanceToken(owner);
        board = new CommunityBoard(owner, address(membership), address(token));
    }

    function test_constructor_setsOwnable() public view {
        assertEq(board.owner(), owner);
    }

    function test_constructor_setsMembership() public view {
        assertEq(address(board.membership()), address(membership));
    }

    function test_constructor_setsGovernanceToken() public view {
        assertEq(board.governanceToken(), address(token));
    }

    function test_constructor_revertsOnEoaMembershipAddress() public {
        address eoa = makeAddr("not-a-contract");
        vm.expectRevert(abi.encodeWithSelector(CommunityBoard.InvalidMembership.selector, eoa));
        new CommunityBoard(owner, eoa, address(token));
    }

    function test_constructor_revertsOnZeroAddressMembership() public {
        vm.expectRevert(abi.encodeWithSelector(CommunityBoard.InvalidMembership.selector, address(0)));
        new CommunityBoard(owner, address(0), address(token));
    }

    function test_constructor_revertsOnEoaGovernanceTokenAddress() public {
        address eoa = makeAddr("not-a-contract-2");
        vm.expectRevert(abi.encodeWithSelector(CommunityBoard.InvalidGovernanceToken.selector, eoa));
        new CommunityBoard(owner, address(membership), eoa);
    }

    function test_constructor_revertsOnZeroAddressGovernanceToken() public {
        vm.expectRevert(abi.encodeWithSelector(CommunityBoard.InvalidGovernanceToken.selector, address(0)));
        new CommunityBoard(owner, address(membership), address(0));
    }

    function test_constructor_revertsWhenMembershipAndGovernanceTokenAreTheSameAddress() public {
        vm.expectRevert(
            abi.encodeWithSelector(CommunityBoard.MembershipAndGovernanceTokenMustDiffer.selector, address(membership))
        );
        new CommunityBoard(owner, address(membership), address(membership));
    }

    function test_adminFunctions_neverCallGovernanceToken() public {
        // CommunityBoard's docstring/ADR-0006 claim `governanceToken` is a
        // pure marker with no function calls made on it. Prove it: wire up
        // a "hostile" governance token whose fallback always reverts, and
        // confirm every admin action still succeeds.
        RevertingFallback hostileToken = new RevertingFallback();
        Membership freshMembership = new Membership(owner);
        CommunityBoard freshBoard = new CommunityBoard(owner, address(freshMembership), address(hostileToken));

        vm.startPrank(owner);
        uint256 roomId = freshBoard.addChatRoom("General", "https://discord.gg/saveearth");
        freshBoard.removeChatRoom(roomId);
        uint256 messageId = freshBoard.addMessage("Climate action starts with us.");
        freshBoard.removeMessage(messageId);
        vm.stopPrank();

        assertFalse(freshBoard.getChatRoom(roomId).active);
        assertFalse(freshBoard.getMessage(messageId).active);
    }

    function test_addChatRoom_afterTransferOwnershipToNonMemberReverts() public {
        address newOwner = makeAddr("newOwner");
        vm.prank(owner);
        board.transferOwnership(newOwner);

        vm.prank(newOwner);
        vm.expectRevert(abi.encodeWithSelector(CommunityBoard.OwnerNotAMember.selector, newOwner));
        board.addChatRoom("General", "https://discord.gg/saveearth");
    }

    function test_addChatRoom_afterTransferOwnershipToExistingMemberSucceeds() public {
        address newOwner = makeAddr("newOwner");
        vm.prank(owner);
        membership.addMember(newOwner); // newOwner joins before taking over ownership

        vm.prank(owner);
        board.transferOwnership(newOwner);

        vm.prank(newOwner);
        uint256 id = board.addChatRoom("General", "https://discord.gg/saveearth");
        assertEq(id, 0);
    }

    function test_addChatRoom_byOwnerWhoLeftMembershipReverts() public {
        vm.prank(owner);
        membership.removeMember(owner);

        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(CommunityBoard.OwnerNotAMember.selector, owner));
        board.addChatRoom("General", "https://discord.gg/saveearth");
    }

    function test_addChatRoom_byOwnerWhoRejoinedMembershipSucceedsAgain() public {
        address alice = makeAddr("alice");
        vm.prank(owner);
        membership.addMember(alice); // a second member, so owner leaving doesn't end the association

        vm.prank(owner);
        membership.removeMember(owner);

        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(CommunityBoard.OwnerNotAMember.selector, owner));
        board.addChatRoom("General", "https://discord.gg/saveearth");

        vm.prank(alice);
        membership.addMember(owner); // alice adds owner back

        vm.prank(owner);
        uint256 id = board.addChatRoom("General", "https://discord.gg/saveearth");
        assertEq(id, 0);
    }

    function test_addMessage_byOwnerWhoLeftMembershipReverts() public {
        vm.prank(owner);
        membership.removeMember(owner);

        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(CommunityBoard.OwnerNotAMember.selector, owner));
        board.addMessage("Climate action starts with us.");
    }

    function test_removeChatRoom_byOwnerWhoLeftMembershipReverts() public {
        vm.prank(owner);
        uint256 id = board.addChatRoom("General", "https://discord.gg/saveearth");

        vm.prank(owner);
        membership.removeMember(owner);

        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(CommunityBoard.OwnerNotAMember.selector, owner));
        board.removeChatRoom(id);
    }

    function test_removeMessage_byOwnerWhoLeftMembershipReverts() public {
        vm.prank(owner);
        uint256 id = board.addMessage("Climate action starts with us.");

        vm.prank(owner);
        membership.removeMember(owner);

        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(CommunityBoard.OwnerNotAMember.selector, owner));
        board.removeMessage(id);
    }

    function test_renounceOwnership_isDisabled() public {
        vm.prank(owner);
        vm.expectRevert(bytes("CommunityBoard: renounce disabled"));
        board.renounceOwnership();
    }

    // ---------------------------------------------------------------
    // chat rooms
    // ---------------------------------------------------------------

    function test_addChatRoom_byOwnerSucceeds() public {
        vm.expectEmit(true, false, false, true, address(board));
        emit CommunityBoard.ChatRoomAdded(0, "General", "https://discord.gg/saveearth");

        vm.prank(owner);
        uint256 id = board.addChatRoom("General", "https://discord.gg/saveearth");

        assertEq(id, 0);
        assertEq(board.chatRoomCount(), 1);
        CommunityBoard.ChatRoom memory room = board.getChatRoom(0);
        assertEq(room.label, "General");
        assertEq(room.url, "https://discord.gg/saveearth");
        assertTrue(room.active);
    }

    function test_addChatRoom_multipleAreIndependentlyTracked() public {
        vm.startPrank(owner);
        uint256 id0 = board.addChatRoom("General", "https://discord.gg/saveearth");
        uint256 id1 = board.addChatRoom("Governance", "https://t.me/saveearth_gov");
        vm.stopPrank();

        assertEq(id0, 0);
        assertEq(id1, 1);
        assertEq(board.chatRoomCount(), 2);
    }

    function test_addChatRoom_byNonOwnerReverts() public {
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        board.addChatRoom("General", "https://discord.gg/saveearth");
    }

    function test_addChatRoom_emptyLabelReverts() public {
        vm.prank(owner);
        vm.expectRevert(CommunityBoard.EmptyValue.selector);
        board.addChatRoom("", "https://discord.gg/saveearth");
    }

    function test_addChatRoom_emptyUrlReverts() public {
        vm.prank(owner);
        vm.expectRevert(CommunityBoard.EmptyValue.selector);
        board.addChatRoom("General", "");
    }

    function test_removeChatRoom_byOwnerSucceeds() public {
        vm.startPrank(owner);
        uint256 id = board.addChatRoom("General", "https://discord.gg/saveearth");

        vm.expectEmit(true, false, false, true, address(board));
        emit CommunityBoard.ChatRoomRemoved(id);
        board.removeChatRoom(id);
        vm.stopPrank();

        assertFalse(board.getChatRoom(id).active);
    }

    function test_removeChatRoom_byNonOwnerReverts() public {
        vm.prank(owner);
        uint256 id = board.addChatRoom("General", "https://discord.gg/saveearth");

        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        board.removeChatRoom(id);
    }

    function test_removeChatRoom_nonExistentReverts() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(CommunityBoard.NotFound.selector, uint256(0)));
        board.removeChatRoom(0);
    }

    function test_removeChatRoom_alreadyRemovedReverts() public {
        vm.startPrank(owner);
        uint256 id = board.addChatRoom("General", "https://discord.gg/saveearth");
        board.removeChatRoom(id);

        vm.expectRevert(abi.encodeWithSelector(CommunityBoard.AlreadyRemoved.selector, id));
        board.removeChatRoom(id);
        vm.stopPrank();
    }

    function test_getActiveChatRooms_excludesRemoved() public {
        vm.startPrank(owner);
        board.addChatRoom("General", "https://discord.gg/saveearth");
        uint256 removedId = board.addChatRoom("Old Room", "https://old.example");
        board.addChatRoom("Governance", "https://t.me/saveearth_gov");
        board.removeChatRoom(removedId);
        vm.stopPrank();

        CommunityBoard.ChatRoom[] memory active = board.getActiveChatRooms();
        assertEq(active.length, 2);
        assertEq(active[0].label, "General");
        assertEq(active[1].label, "Governance");
    }

    function test_getActiveChatRooms_emptyWhenNoneAdded() public view {
        CommunityBoard.ChatRoom[] memory active = board.getActiveChatRooms();
        assertEq(active.length, 0);
    }

    // ---------------------------------------------------------------
    // mission messages
    // ---------------------------------------------------------------

    function test_addMessage_byOwnerSucceeds() public {
        vm.expectEmit(true, false, false, true, address(board));
        emit CommunityBoard.MessageAdded(0, "Climate action starts with us.");

        vm.prank(owner);
        uint256 id = board.addMessage("Climate action starts with us.");

        assertEq(id, 0);
        assertEq(board.messageCount(), 1);
        CommunityBoard.Message memory message = board.getMessage(0);
        assertEq(message.content, "Climate action starts with us.");
        assertTrue(message.active);
    }

    function test_addMessage_byNonOwnerReverts() public {
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        board.addMessage("Climate action starts with us.");
    }

    function test_addMessage_emptyContentReverts() public {
        vm.prank(owner);
        vm.expectRevert(CommunityBoard.EmptyValue.selector);
        board.addMessage("");
    }

    function test_removeMessage_byOwnerSucceeds() public {
        vm.startPrank(owner);
        uint256 id = board.addMessage("Climate action starts with us.");

        vm.expectEmit(true, false, false, true, address(board));
        emit CommunityBoard.MessageRemoved(id);
        board.removeMessage(id);
        vm.stopPrank();

        assertFalse(board.getMessage(id).active);
    }

    function test_removeMessage_byNonOwnerReverts() public {
        vm.prank(owner);
        uint256 id = board.addMessage("Climate action starts with us.");

        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        board.removeMessage(id);
    }

    function test_removeMessage_nonExistentReverts() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(CommunityBoard.NotFound.selector, uint256(0)));
        board.removeMessage(0);
    }

    function test_removeMessage_alreadyRemovedReverts() public {
        vm.startPrank(owner);
        uint256 id = board.addMessage("Climate action starts with us.");
        board.removeMessage(id);

        vm.expectRevert(abi.encodeWithSelector(CommunityBoard.AlreadyRemoved.selector, id));
        board.removeMessage(id);
        vm.stopPrank();
    }

    function test_getActiveMessages_excludesRemoved() public {
        vm.startPrank(owner);
        board.addMessage("Climate action starts with us.");
        uint256 removedId = board.addMessage("Outdated goal.");
        board.addMessage("Current goal: 100 members across 30 countries.");
        board.removeMessage(removedId);
        vm.stopPrank();

        CommunityBoard.Message[] memory active = board.getActiveMessages();
        assertEq(active.length, 2);
        assertEq(active[0].content, "Climate action starts with us.");
        assertEq(active[1].content, "Current goal: 100 members across 30 countries.");
    }

    function test_getActiveMessages_emptyWhenNoneAdded() public view {
        CommunityBoard.Message[] memory active = board.getActiveMessages();
        assertEq(active.length, 0);
    }
}

/// @dev Minimal contract that reverts on any call, used to prove
/// CommunityBoard never actually calls its `governanceToken` reference.
contract RevertingFallback {
    fallback() external payable {
        revert("RevertingFallback: no calls allowed");
    }
}
