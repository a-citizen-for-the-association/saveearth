// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Owner-managed lists of chat room links and mission/goal messages.
///         Entries are soft-deleted (active flag) so ids stay stable for callers.
contract CommunityBoard is Ownable {
    struct ChatRoom {
        string label;
        string url;
        bool active;
    }

    struct Message {
        string content;
        bool active;
    }

    mapping(uint256 => ChatRoom) private chatRooms;
    uint256 public chatRoomCount;

    mapping(uint256 => Message) private messages;
    uint256 public messageCount;

    event ChatRoomAdded(uint256 indexed id, string label, string url);
    event ChatRoomRemoved(uint256 indexed id);
    event MessageAdded(uint256 indexed id, string content);
    event MessageRemoved(uint256 indexed id);

    error EmptyValue();
    error NotFound(uint256 id);
    error AlreadyRemoved(uint256 id);

    constructor(address initialOwner) Ownable(initialOwner) { }

    function addChatRoom(string calldata label, string calldata url) external onlyOwner returns (uint256 id) {
        if (bytes(label).length == 0 || bytes(url).length == 0) revert EmptyValue();
        id = chatRoomCount++;
        chatRooms[id] = ChatRoom({ label: label, url: url, active: true });
        emit ChatRoomAdded(id, label, url);
    }

    function removeChatRoom(uint256 id) external onlyOwner {
        if (id >= chatRoomCount) revert NotFound(id);
        ChatRoom storage room = chatRooms[id];
        if (!room.active) revert AlreadyRemoved(id);
        room.active = false;
        emit ChatRoomRemoved(id);
    }

    function addMessage(string calldata content) external onlyOwner returns (uint256 id) {
        if (bytes(content).length == 0) revert EmptyValue();
        id = messageCount++;
        messages[id] = Message({ content: content, active: true });
        emit MessageAdded(id, content);
    }

    function removeMessage(uint256 id) external onlyOwner {
        if (id >= messageCount) revert NotFound(id);
        Message storage message = messages[id];
        if (!message.active) revert AlreadyRemoved(id);
        message.active = false;
        emit MessageRemoved(id);
    }

    function getChatRoom(uint256 id) external view returns (ChatRoom memory) {
        return chatRooms[id];
    }

    function getMessage(uint256 id) external view returns (Message memory) {
        return messages[id];
    }

    /// @notice Disabled. A non-upgradeable contract must always retain an Owner
    ///         so that chat rooms/messages remain manageable and the future
    ///         Council `transferOwnership` migration (ADR-0004) stays available.
    function renounceOwnership() public pure override {
        revert("CommunityBoard: renounce disabled");
    }

    function getActiveChatRooms() external view returns (ChatRoom[] memory active) {
        uint256 activeCount = _countActiveChatRooms();
        active = new ChatRoom[](activeCount);
        uint256 cursor = 0;
        for (uint256 i = 0; i < chatRoomCount; i++) {
            if (chatRooms[i].active) {
                active[cursor] = chatRooms[i];
                cursor++;
            }
        }
    }

    function getActiveMessages() external view returns (Message[] memory active) {
        uint256 activeCount = _countActiveMessages();
        active = new Message[](activeCount);
        uint256 cursor = 0;
        for (uint256 i = 0; i < messageCount; i++) {
            if (messages[i].active) {
                active[cursor] = messages[i];
                cursor++;
            }
        }
    }

    function _countActiveChatRooms() private view returns (uint256 count) {
        for (uint256 i = 0; i < chatRoomCount; i++) {
            if (chatRooms[i].active) count++;
        }
    }

    function _countActiveMessages() private view returns (uint256 count) {
        for (uint256 i = 0; i < messageCount; i++) {
            if (messages[i].active) count++;
        }
    }
}
