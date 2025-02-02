document.addEventListener('DOMContentLoaded', () => {
    const usernameDisplay = document.getElementById('username-display');
    const threadListDiv = document.getElementById('thread-list');
    const createThreadButton = document.getElementById('create-thread-button');
    const threadTitleInput = document.getElementById('thread-title');
    const threadContentInput = document.getElementById('thread-content');
    const threadsSection = document.getElementById('threads-section');
    const threadViewSection = document.getElementById('thread-view');
    const viewThreadTitleElement = document.getElementById('view-thread-title');
    const backToThreadsButtonTop = document.getElementById('back-to-threads-top');
    const backToThreadsButtonBottom = document.getElementById('back-to-threads');
    const viewThreadContentElement = document.getElementById('view-thread-content');
    const commentListDiv = document.getElementById('comment-list');
    const createCommentButton = document.getElementById('create-comment-button');
    const commentContentInput = document.getElementById('comment-content');
    const threadImageInput = document.getElementById('thread-image');
    const threadVideoInput = document.getElementById('thread-video');
    const viewThreadImage = document.getElementById('view-thread-image');
    const viewThreadVideo = document.getElementById('view-thread-video');

    let currentUsername = '';
    let currentThreadId = null;
    let uploadedImageData = null; // Store data URL for uploaded image
    let uploadedVideoData = null; // Store data URL for uploaded video

    // --- Socket.IO Connection ---
    const socket = io();

    // Request initial threads and username when connecting
    socket.on('connect', () => {
        socket.emit('initialLoad');
    });

    // Receive initial threads
    socket.on('initialThreads', (threads) => {
        threadListDiv.innerHTML = '';
        threads.forEach(thread => {
            const threadItem = document.createElement('div');
            threadItem.classList.add('thread-item');
            threadItem.textContent = `${thread.title} (by ${thread.username})`;
            threadItem.addEventListener('click', () => displayThreadView(thread.id, thread.title, thread.content, thread.imageData, thread.videoData));
            threadListDiv.appendChild(threadItem);
        });
    });

    // Receive username
    socket.on('username', (data) => {
        currentUsername = data.username;
        usernameDisplay.textContent = `Your Anonymous Username: ${currentUsername}`;
    });

    // Update thread list on new thread
    socket.on('newThread', (threads) => {
        threadListDiv.innerHTML = '';
        threads.forEach(thread => {
            const threadItem = document.createElement('div');
            threadItem.classList.add('thread-item');
            threadItem.textContent = `${thread.title} (by ${thread.username})`;
            threadItem.addEventListener('click', () => displayThreadView(thread.id, thread.title, thread.content, thread.imageData, thread.videoData));
            threadListDiv.appendChild(threadItem);
        });
    });

    // Update comments on new comment
    socket.on('newComment', ({ threadId, comments }) => {
        if (currentThreadId === threadId) {
            commentListDiv.innerHTML = '';
            comments.forEach(comment => {
                const commentItem = document.createElement('div');
                commentItem.classList.add('comment-item');
                commentItem.innerHTML = `<p><strong>${comment.username}:</strong> ${marked.parse(comment.content)}</p>`;
                commentListDiv.appendChild(commentItem);
            });
        }
    });

    viewThreadTitleElement.addEventListener('click', () => {
        threadsSection.style.display = 'block';
        threadViewSection.style.display = 'none';
        currentThreadId = null;
    });

    backToThreadsButtonTop.addEventListener('click', () => {
        threadsSection.style.display = 'block';
        threadViewSection.style.display = 'none';
        currentThreadId = null;
    });

    backToThreadsButtonBottom.addEventListener('click', () => {
        threadsSection.style.display = 'block';
        threadViewSection.style.display = 'none';
        currentThreadId = null;
    });

    // Function to display thread view
    const displayThreadView = async (threadId, title, content, imageData, videoData) => {
        currentThreadId = threadId;
        viewThreadTitleElement.textContent = title;
        // Use marked.parse() to render Markdown content
        viewThreadContentElement.innerHTML = marked.parse(content); // Render markdown here!
        threadsSection.style.display = 'none';
        threadViewSection.style.display = 'block';

        // Display image if available
        if (imageData) {
            viewThreadImage.src = imageData;
            viewThreadImage.style.display = 'block';
        } else {
            viewThreadImage.style.display = 'none';
        }

        // Display video if available
        if (videoData) {
            viewThreadVideo.src = videoData;
            viewThreadVideo.style.display = 'block';
        } else {
            viewThreadVideo.style.display = 'none';
        }

        await fetchComments(threadId); // Load comments for the thread
    };

    // Function to fetch comments for a specific thread
    const fetchComments = async (threadId) => {
        const response = await fetch(`/api/threads/${threadId}/comments`);
        const comments = await response.json();
        commentListDiv.innerHTML = ''; // Clear existing comments
        comments.forEach(comment => {
            const commentItem = document.createElement('div');
            commentItem.classList.add('comment-item');
            // Use marked.parse() to render Markdown content in comments too
            commentItem.innerHTML = `<p><strong>${comment.username}:</strong> ${marked.parse(comment.content)}</p>`; // Render markdown here!
            commentListDiv.appendChild(commentItem);
        });
    };

    const readUploadedFileAsDataURL = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });
    };

    threadImageInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (file) {
            try {
                uploadedImageData = await readUploadedFileAsDataURL(file);
            } catch (error) {
                console.error("Error reading image file:", error);
                alert("Error reading image file. Please try again.");
            }
        } else {
            uploadedImageData = null;
        }
    });

    threadVideoInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (file) {
            try {
                uploadedVideoData = await readUploadedFileAsDataURL(file);
            } catch (error) {
                console.error("Error reading video file:", error);
                alert("Error reading video file. Please try again.");
            }
        } else {
            uploadedVideoData = null;
        }
    });

    // Event listener for creating a thread
    createThreadButton.addEventListener('click', async () => {
        const title = threadTitleInput.value;
        const content = threadContentInput.value;
        const captchaResponse = grecaptcha.getResponse();

        if (!title || !content) {
            alert('Please fill in all fields.');
            return;
        }

        if (!captchaResponse) {
            alert('Please complete the reCAPTCHA.');
            return;
        }

        const response = await fetch('/api/threads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: currentUsername,
                title,
                content,
                captcha: captchaResponse,
                imageData: uploadedImageData,
                videoData: uploadedVideoData
            })
        });

        if (response.ok) {
            alert('Thread created successfully!');
            threadTitleInput.value = '';
            threadContentInput.value = '';
            threadImageInput.value = ''; // Clear file input
            threadVideoInput.value = ''; // Clear file input
            uploadedImageData = null; // Reset data URL
            uploadedVideoData = null; // Reset data URL

            // Reset the reCAPTCHA
            grecaptcha.reset();

            // Don't fetch threads here, rely on 'newThread' event
            threadsSection.style.display = 'block';
            threadViewSection.style.display = 'none';
        } else {
            const errorData = await response.json();
            alert(`Error creating thread: ${errorData.error || 'Unknown error'}`);
        }
    });

    // Event listener for creating a comment
    createCommentButton.addEventListener('click', async () => {
        const content = commentContentInput.value;

        if (!content) {
            alert('Please fill in comment.');
            return;
        }

        const response = await fetch(`/api/threads/${currentThreadId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                threadId: currentThreadId, 
                username: currentUsername, 
                content
            })
        });

        if (response.ok) {
            commentContentInput.value = '';
            // Don't fetch comments here, rely on 'newComment' event
        } else {
            const errorData = await response.json();
            alert(`Error creating comment: ${errorData.error || 'Unknown error'}`);
        }
    });

    // Event listener for back to threads button
    backToThreadsButton.addEventListener('click', () => {
        threadsSection.style.display = 'block';
        threadViewSection.style.display = 'none';
        currentThreadId = null;
    });
});