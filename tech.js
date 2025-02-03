// Import Firebase (use the appropriate CDN links or npm packages if you're not using a CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getFirestore, collection, addDoc, updateDoc, doc, arrayUnion, onSnapshot, serverTimestamp, getDoc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

// Firebase configuration (replace with your Firebase project config)
const firebaseConfig = {
    apiKey: "AIzaSyAKLayrYLBxG9yvfZuX2kI9l01UgIcW_Ng",
    authDomain: "esdpro-af228.firebaseapp.com",
    projectId: "esdpro-af228",
    storageBucket: "esdpro-af228.appspot.com",
    messagingSenderId: "549835606763",
    appId: "1:549835606763:web:83c959607b4c2cd2a04cae",
    measurementId: "G-5TL8R47FMN"
};

// Initialize Firebase and Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Get the board ID from the URL query parameter
const urlParams = new URLSearchParams(window.location.search);
const boardId = urlParams.get("boardId") || "boardtech"; // Default to "board1" if no boardId is provided

// Function to create a new discussion (with "anon" sender)
async function createDiscussion(message) {
    try {
        await addDoc(collection(db, "discussions"), {
            message: message,
            sender: "anon", // Set sender as "anon"
            replies: [],
            timestamp: serverTimestamp(),
            boardId: boardId, // Associate the discussion with the current board
        });
        console.log("Discussion created successfully!");
    } catch (error) {
        console.error("Error creating discussion: ", error);
    }
}

// Function to add a reply to a discussion (with "anon" sender)
async function addReply(discussionId, replyMessage) {
    try {
        const discussionRef = doc(db, "discussions", discussionId);
        await updateDoc(discussionRef, {
            replies: arrayUnion({ message: replyMessage, sender: "anon" }), // Set reply sender as "anon"
        });
        console.log("Reply added successfully!");
    } catch (error) {
        console.error("Error adding reply: ", error);
    }
}

// Function to mark a message or reply as deleted
async function deleteMessage(discussionId, isReply = false, replyIndex = null) {
    try {
        const discussionRef = doc(db, "discussions", discussionId);
        
        if (isReply && replyIndex !== null) {
            // Handle reply deletion
            const docSnap = await getDoc(discussionRef);
            const replies = docSnap.data().replies || [];
            // Update the specific reply to be marked as deleted
            replies[replyIndex].message = "[deleted]";  
            await updateDoc(discussionRef, {
                replies: replies,
            });
        } else {
            // Handle discussion deletion
            await updateDoc(discussionRef, {
                message: "[deleted]",  // Mark discussion as deleted
            });
        }
        console.log("Message deleted successfully!");
    } catch (error) {
        console.error("Error deleting message: ", error);
    }
}

// Function to render all discussions for the current board
function renderDiscussions(discussions) {
    const discussionList = document.getElementById("discussion-list");
    discussionList.innerHTML = ""; // Clear the list before re-rendering

    discussions.forEach((discussion) => {
        // Ensure data is valid
        const message = discussion.message || "[No message]";
        const sender = discussion.sender || "anon";
        
        const discussionDiv = document.createElement("div");
        discussionDiv.className = "discussion";
        discussionDiv.dataset.id = discussion.id;  // Set discussion ID as a data attribute
        discussionDiv.innerHTML = `
            <div class="message">
                <strong>${sender}</strong>: ${message}
                <button class="delete-discussion">Delete</button>
            </div>
            <div class="replies">
                ${discussion.replies
                    .map((reply, index) => {
                        const replyMessage = reply.message || "[No message]";
                        const replySender = reply.sender || "anon";
                        return `
                            <div class="reply">
                                <strong>${replySender}</strong>: ${replyMessage}
                                <button class="delete-reply" data-index="${index}">Delete</button>
                            </div>
                        `;
                    })
                    .join("")}
            </div>
            <form class="reply-form" data-discussion-id="${discussion.id}">
                <textarea placeholder="Reply to this discussion..." required></textarea>
                <button type="submit">Reply</button>
            </form>
        `;
        discussionList.appendChild(discussionDiv);
    });

    // Add event listeners to reply forms
    document.querySelectorAll(".reply-form").forEach((form) => {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            const discussionId = form.dataset.discussionId;
            const replyMessage = form.querySelector("textarea").value;
            if (replyMessage.trim() !== "") {
                addReply(discussionId, replyMessage);
                form.reset();
            } else {
                alert("Please enter a reply!");
            }
        });
    });

    // Add event listeners to delete buttons
    document.querySelectorAll(".delete-discussion").forEach((button) => {
        button.addEventListener("click", () => {
            const discussionId = button.closest(".discussion").dataset.id;
            deleteMessage(discussionId);
        });
    });

    document.querySelectorAll(".delete-reply").forEach((button) => {
        button.addEventListener("click", () => {
            const discussionId = button.closest(".discussion").dataset.id;
            const replyIndex = button.dataset.index;
            deleteMessage(discussionId, true, replyIndex);
        });
    });
}

// Real-time listener for discussions (Firestore snapshot)
onSnapshot(collection(db, "discussions"), (snapshot) => {
    const discussions = [];
    snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.boardId === boardId) { // Only fetch discussions for the current board
            discussions.push({
                id: doc.id,
                message: data.message,
                sender: data.sender || "anon", // Default to "anon"
                replies: data.replies || [], // Ensure replies array exists
                timestamp: data.timestamp,
            });
        }
    });
    renderDiscussions(discussions);
});

// Event listener for the new discussion form
document.getElementById("discussion-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const message = document.getElementById("discussion-text").value;
    if (message.trim() !== "") {
        createDiscussion(message);
        e.target.reset();
    } else {
        alert("Please enter a message!");
    }
});
