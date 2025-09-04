document.addEventListener("DOMContentLoaded", () => {
  let username = sessionStorage.getItem("username");
  if (!username) {
    username = prompt("Enter your username:");
    if (!username) username = "Anonymous";
    sessionStorage.setItem("username", username);
  }

  const token = "12345"; // harus cocok dengan VALID_TOKEN di server
  const socket = new WebSocket(`wss://localhost:8443?token=${token}`);

  const form = document.querySelector("form");
  const input = document.querySelector("input");
  const messages = document.getElementById("messages");
  const usersList = document.getElementById("users");
  const typingNotif = document.getElementById("typing-notification");
  const statusText = document.getElementById("status");

  let typingTimeout;
  let startPingTime;

  socket.addEventListener("open", () => {
    statusText.textContent = "Connected to WebSocket ✅";
    statusText.style.color = "green";

    socket.send(JSON.stringify({ type: "join", username }));

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (input.value.trim()) {
        socket.send(
          JSON.stringify({
            type: "chat",
            message: input.value.trim(),
            username,
          })
        );
        input.value = "";
      }
    });

    input.addEventListener("input", () => {
      socket.send(JSON.stringify({ type: "typing", username }));
      clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => {
        socket.send(JSON.stringify({ type: "stopTyping", username }));
      }, 1000);
    });

    setInterval(() => {
      sendPing();
    }, 10000); // kirim ping setiap 10 detik
  });

  socket.addEventListener("close", () => {
    statusText.textContent = "Disconnected ❌";
    statusText.style.color = "red";
  });

  socket.addEventListener("error", (err) => {
    statusText.textContent = "WebSocket Error!";
    statusText.style.color = "red";
    console.error("WebSocket error:", err);
  });

  socket.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);

    switch (data.type) {
      case "error":
        alert(`❗ Error: ${data.message}`);
        socket.close();
        break;

      case "pong":
        const latency = Date.now() - startPingTime;
        console.log(`⏱️ Ping WebSocket: ${latency} ms`);
        statusText.textContent = `Connected ✅ | Ping: ${latency} ms`;
        break;

      case "init":
        printSystemMessage(`📢 ${data.message}`);
        break;

      case "userList":
        updateUserList(data.users);
        break;

      case "join":
        printSystemMessage(`${data.username} joined the chat`);
        break;

      case "leave":
        printSystemMessage(`${data.username} left the chat`);
        break;

      case "chat":
        printChatMessage(data);
        break;

      case "typing":
        typingNotif.textContent = `${data.username} is typing...`;
        break;

      case "stopTyping":
        typingNotif.textContent = "";
        break;
    }
  });

  function sendPing() {
    startPingTime = Date.now();
    socket.send(JSON.stringify({ type: "ping" }));
  }

  function printSystemMessage(msg) {
    const li = document.createElement("li");
    li.textContent = msg;
    li.classList.add("system");
    messages.appendChild(li);
    messages.scrollTop = messages.scrollHeight;
  }

  function printChatMessage(data) {
    const li = document.createElement("li");
    const time = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    li.textContent = `[${time}] ${data.username}: ${data.message}`;
    if (data.username === sessionStorage.getItem("username")) {
      li.classList.add("me");
    }
    messages.appendChild(li);
    messages.scrollTop = messages.scrollHeight;
  }

  function updateUserList(users) {
    usersList.innerHTML = "";
    users.forEach((user) => {
      const li = document.createElement("li");
      li.textContent = user;
      usersList.appendChild(li);
    });
  }
});
