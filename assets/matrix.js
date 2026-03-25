const MX_STORE = "lazy_matrix_session";
let mxClient = null;
let mxRoomId = "#lazylinux-support:matrix.org";

function openMatrixClient() {
    startMenu.classList.add("hidden");

    createOrFocus("matrix", () => {

        const html = `
        <div id="matrix-app" style="
            background:#000;
            color:#00ff9c;
            font-family:monospace;
            height:100%;
            display:flex;
            flex-direction:column;
        ">

            <div style="padding:8px;border-bottom:1px solid #033">
                > LazyLinux Experimental Matrix Client
            </div>

            <!-- LOGIN -->
            <div id="matrix-login" style="
                flex:1;
                display:flex;
                align-items:center;
                justify-content:center;
            ">

                <div style="
                    width:260px;
                    padding:18px;
                    background:#050505;
                    border:1px solid #033;
                    box-shadow:0 0 12px rgba(0,255,150,0.08);
                ">

                    <div style="
                        margin-bottom:12px;
                        color:#0aa;
                        font-size:13px;
                    ">
                        > authenticate to matrix.org
                    </div>

                    <div style="width:245px;">
                        <input id="mx-user" placeholder="username"
                            style="
                                width:100%;
                                margin-bottom:8px;
                                background:#111;
                                border:1px solid #033;
                                color:#0f0;
                                padding:7px;
                                outline:none;
                            ">
                        <input id="mx-pass" type="password" placeholder="password"
                            style="
                                width:100%;
                                margin-bottom:10px;
                                background:#111;
                                border:1px solid #033;
                                color:#0f0;
                                padding:7px;
                                outline:none;
                            ">
                    </div>
                    <button id="mx-login-btn"
                        style="
                            width:100%;
                            background:#022;
                            color:#0f0;
                            border:none;
                            padding:7px;
                            cursor:pointer;
                        ">
                        login
                    </button>

                </div>
            </div>

            <!-- CHAT -->
            <div id="matrix-chat" style="display:none;flex:1;flex-direction:column">

                <div style="
                    padding:6px;
                    font-size:12px;
                    color:#0aa;
                    border-bottom:1px solid #033;
                ">
                    [info] for full experience →
                    <span style="color:#4af;cursor:pointer"
                    onclick="window.open('https://app.element.io/#/room/#lazylinux-support:matrix.org','_blank')">
                    open element
                    </span>
                </div>
                <!-- logout hint -->
                <div style="
                    padding:4px 8px;
                    font-size:11px;
                    color:#055;
                    border-bottom:1px solid #033;
                ">
                    Type <span style="color:#4af;">/logout</span> to log out
                </div>
                <div id="mx-messages" style="
                    flex:1;
                    padding:10px;
                    overflow:auto;
                    font-size:13px;
                "></div>

                <div style="display:flex;border-top:1px solid #033">
                    <input id="mx-input"
                        placeholder="type message..."
                        style="flex:1;background:#111;border:none;color:#0f0;padding:8px">

                    <button id="mx-send"
                        style="background:#022;color:#0f0;border:none;padding:8px">
                        send
                    </button>
                </div>

            </div>
        </div>
        `;

        const box = new WinBox("Support", {
            index: 2,
            html,
            background: "#2c2c2c",
            width: "35%",
            height: "50%",
            maxwidth: "100%",
            maxheight: "100%",
            x: "center",
            y: "center",        
            border: "2px",
            icon: "assets/img/terminal.svg",
            class: [ "no-shadow", "no-full" ],
        });

        initMatrixClient();

        return box;
    });
}

async function initMatrixClient() {

    const baseUrl = "https://matrix.org";
    const saved = localStorage.getItem(MX_STORE);

    if (saved) {
        try {
            const session = JSON.parse(saved);

            mxClient = matrixcs.createClient({
                baseUrl,
                accessToken: session.access_token,
                userId: session.user_id,
                deviceId: session.device_id
            });

            showChat();

            await mxClient.startClient();

            const room = await mxClient.joinRoom(mxRoomId);
            listenMessages(room.roomId);

            return;

        } catch (e) {
            console.error("Session restore failed", e);
            localStorage.removeItem(MX_STORE);
        }
    }

    setupLogin();
}

function setupLogin() {

    const loginBtn = document.getElementById("mx-login-btn");
    const userInput = document.getElementById("mx-user");
    const passInput = document.getElementById("mx-pass");

    async function doLogin() {

        const user = userInput.value;
        const pass = passInput.value;

        const baseUrl = "https://matrix.org";

        mxClient = matrixcs.createClient({ baseUrl });

        try {
            const res = await mxClient.login("m.login.password", {
                user,
                password: pass
            });

            const session = {
                access_token: res.access_token,
                user_id: res.user_id,
                device_id: res.device_id
            };

            localStorage.setItem(MX_STORE, JSON.stringify(session));

            mxClient = matrixcs.createClient({
                baseUrl,
                accessToken: session.access_token,
                userId: session.user_id,
                deviceId: session.device_id
            });

            showChat();

            await mxClient.startClient();

            const room = await mxClient.joinRoom(mxRoomId);
            listenMessages(room.roomId);

        } catch (e) {
            alert("Login failed");
            console.error(e);
        }
    }

    loginBtn.onclick = doLogin;

    [userInput, passInput].forEach(el => {
        el.addEventListener("keypress", e => {
            if (e.key === "Enter") {
                doLogin();
            }
        });
    });
}

function showChat() {
    document.getElementById("matrix-login").style.display = "none";
    document.getElementById("matrix-chat").style.display = "flex";

    document.getElementById("mx-send").onclick = sendMessage;

    document.getElementById("mx-input").addEventListener("keypress", e => {
        if (e.key === "Enter") sendMessage();
    });
}

function listenMessages(roomId) {

    const container = document.getElementById("mx-messages");

    mxClient.on("Room.timeline", function (event, room) {

        if (room.roomId !== roomId) return;
        if (event.getType() !== "m.room.message") return;

        const msg = event.getContent().body;
        if(msg === undefined) return;

        const sender = event.getSender();

        const line = document.createElement("div");
        line.textContent = `[${sender}] ${msg}`;

        container.appendChild(line);
        container.scrollTop = container.scrollHeight;
    });
}

function logoutMatrix() {
    localStorage.removeItem(MX_STORE);
    initMatrixClient();
    document.getElementById("matrix-login").style.display = "flex";
    document.getElementById("matrix-chat").style.display = "none";    
}

async function sendMessage() {

    const input = document.getElementById("mx-input");
    const text = input.value.trim();

    if (!text) return;

    if (text === "/logout") {
        logoutMatrix();
        return;
    }

    const room = Object.values(mxClient.getRooms())[0];

    try {
        await mxClient.sendTextMessage(room.roomId, text);
        input.value = "";
    } catch (e) {
        console.error("Send failed", e);
    }
}