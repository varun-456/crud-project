// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DocumentStorage {
    enum Role { None, Admin, Lawyer, Client }
    enum Action { Uploaded, Modified, Deleted, Retrieved }

    struct DocumentHistory {
        string version;
        string timestamp;
        Action action;
        string documentHash;
        address user;
    }

    mapping(address => Role) public userRoles;
    address[] public users;

    mapping(string => string) private documentHashes;
    mapping(string => address) private documentOwners; 
    mapping(string => DocumentHistory[]) private documentHistories; 
    string[] private documentIds;

    event DocumentHashStored(string documentId, string documentHash, uint256 version);
    event DocumentHashModified(string documentId, string newDocumentHash, uint256 version);
    event DocumentDeleted(string documentId, uint256 version);
    event AllDocumentsRemoved();
    event RoleAssigned(address user, Role role);

    modifier onlyAdmin() {
        require(userRoles[msg.sender] == Role.Admin, "Only admin can perform this action");
        _;
    }

    modifier onlyAdminOrLawyer() {
        require(userRoles[msg.sender] == Role.Admin || userRoles[msg.sender] == Role.Lawyer, "Only admin or lawyer can perform this action");
        _;
    }

    modifier onlyOwnerOrAdmin(string memory documentId) {
        require(documentOwners[documentId] == msg.sender || userRoles[msg.sender] == Role.Admin, "Only owner or admin can perform this action");
        _;
    }

    constructor() {
        userRoles[msg.sender] = Role.Admin;
        users.push(msg.sender);
    }

    function storeDocumentHash(string memory documentId, string memory documentHash) public onlyAdminOrLawyer {
        documentHashes[documentId] = documentHash;
        documentOwners[documentId] = msg.sender; 
        documentIds.push(documentId);
        uint256 version = documentHistories[documentId].length + 1;
        documentHistories[documentId].push(DocumentHistory(
            uintToString(version), 
            uintToString(block.timestamp), 
            Action.Uploaded, 
            documentHash, 
            msg.sender
        ));
        emit DocumentHashStored(documentId, documentHash, version);
    }

    function getDocumentHash(string memory documentId) public returns (string memory) {
        string memory hash = documentHashes[documentId];
        uint256 version = documentHistories[documentId].length + 1;
        documentHistories[documentId].push(DocumentHistory(
            uintToString(version), 
            uintToString(block.timestamp), 
            Action.Retrieved, 
            hash, 
            msg.sender
        ));
        return hash;
    }

    function getAllDocumentHashes() public view returns (string[] memory, string[] memory) {
        string[] memory hashes = new string[](documentIds.length);
        for (uint i = 0; i < documentIds.length; i++) {
            hashes[i] = documentHashes[documentIds[i]];
        }
        return (documentIds, hashes);
    }

    function modifyDocumentHash(string memory documentId, string memory newDocumentHash) public onlyOwnerOrAdmin(documentId) {
        require(bytes(documentHashes[documentId]).length != 0, "Document does not exist");
        documentHashes[documentId] = newDocumentHash;
        uint256 version = documentHistories[documentId].length + 1;
        documentHistories[documentId].push(DocumentHistory(
            uintToString(version), 
            uintToString(block.timestamp), 
            Action.Modified, 
            newDocumentHash, 
            msg.sender
        ));
        emit DocumentHashModified(documentId, newDocumentHash, version);
    }

    function deleteDocument(string memory documentId) public onlyOwnerOrAdmin(documentId) {
        require(bytes(documentHashes[documentId]).length != 0, "Document does not exist");
        delete documentHashes[documentId];
        delete documentOwners[documentId];
        for (uint i = 0; i < documentIds.length; i++) {
            if (keccak256(bytes(documentIds[i])) == keccak256(bytes(documentId))) {
                documentIds[i] = documentIds[documentIds.length - 1];
                documentIds.pop();
                break;
            }
        }
        uint256 version = documentHistories[documentId].length + 1;
        documentHistories[documentId].push(DocumentHistory(
            uintToString(version), 
            uintToString(block.timestamp), 
            Action.Deleted, 
            "", 
            msg.sender
        ));
        emit DocumentDeleted(documentId, version);
    }

    function removeAllDocuments() public onlyAdmin {
        for (uint i = 0; i < documentIds.length; i++) {
            delete documentHashes[documentIds[i]];
            delete documentOwners[documentIds[i]];
        }
        delete documentIds;
        emit AllDocumentsRemoved();
    }

    function assignRole(address user, Role role) public onlyAdmin {
        if (userRoles[user] == Role.None) {
            users.push(user);
        }
        userRoles[user] = role;
        emit RoleAssigned(user, role);
    }

    function getAllRoles() public view returns (address[] memory, Role[] memory) {
        Role[] memory roles = new Role[](users.length);
        for (uint i = 0; i < users.length; i++) {
            roles[i] = userRoles[users[i]];
        }
        return (users, roles);
    }

    function getDocumentOwner(string memory documentId) public view returns (address) {
        return documentOwners[documentId];
    }

    function getDocumentHistory(string memory documentId) public view returns (DocumentHistory[] memory) {
        return documentHistories[documentId];
    }

    function getDocumentsByOwner(address owner) public view returns (string[] memory) {
        uint count = 0;
        for (uint i = 0; i < documentIds.length; i++) {
            if (documentOwners[documentIds[i]] == owner) {
                count++;
            }
        }

        string[] memory ownerDocuments = new string[](count);
        uint index = 0;
        for (uint i = 0; i < documentIds.length; i++) {
            if (documentOwners[documentIds[i]] == owner) {
                ownerDocuments[index] = documentIds[i];
                index++;
            }
        }

        return ownerDocuments;
    }

    function uintToString(uint v) private pure returns (string memory) {
        uint maxlength = 100;
        bytes memory reversed = new bytes(maxlength);
        uint i = 0;
        while (v != 0) {
            uint remainder = v % 10;
            v = v / 10;
            reversed[i++] = bytes1(uint8(48 + remainder));
        }
        bytes memory s = new bytes(i); // i + 1 is inefficient
        for (uint j = 0; j < i; j++) {
            s[j] = reversed[i - j - 1]; // to get the correct order
        }
        string memory str = string(s);  // memory isn't implicitly convertible to storage
        return str;
    }

    function getAllUserFiles() public view returns (address[] memory, string[][] memory) {
        string[][] memory userFiles = new string[][](users.length);
        for (uint i = 0; i < users.length; i++) {
            uint count = 0;
            for (uint j = 0; j < documentIds.length; j++) {
                if (documentOwners[documentIds[j]] == users[i]) {
                    count++;
                }
            }
            userFiles[i] = new string[](count);
            uint index = 0;
            for (uint j = 0; j < documentIds.length; j++) {
                if (documentOwners[documentIds[j]] == users[i]) {
                    userFiles[i][index] = documentIds[j];
                    index++;
                }
            }
        }
        return (users, userFiles);
    }

    function getAllDocumentHistories() public view onlyAdmin returns (string[] memory, DocumentHistory[][] memory) {
        DocumentHistory[][] memory histories = new DocumentHistory[][](documentIds.length);
        for (uint i = 0; i < documentIds.length; i++) {
            histories[i] = documentHistories[documentIds[i]];
        }
        return (documentIds, histories);
    }
}