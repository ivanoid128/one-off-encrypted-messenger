// Initialize Firebase
var config = {
	apiKey: "AIzaSyBlr6CunqeB5Mae0_MEXIkM2agLN5Dh6RI",
	authDomain: "one-off-encrypted-messenger.firebaseapp.com",
	databaseURL: "https://one-off-encrypted-messenger.firebaseio.com",
	projectId: "one-off-encrypted-messenger",
	storageBucket: "one-off-encrypted-messenger.appspot.com",
	messagingSenderId: "741861384403"
};
firebase.initializeApp(config);

// Setting Consts
const database = firebase.database();
let userid;

firebase.auth().signInAnonymously().catch(console.log);

firebase.auth().onAuthStateChanged(function (user) {
	if (user) {
		// User is signed in.
		var isAnonymous = user.isAnonymous;
		var uid = user.uid;
		userid = user.uid;
		userid = getCaller_uid(userid);

		WebRTCInit(database, getPeerType(), userid).then(function (param) {
			console.log(param)
			const connection = callerConnection ? callerConnection : calleeConnection;
			console.log(connection)
		})
			.then(sendHelloMsg)
			.then(UIInit)

	}
});

function getPeerType() {
	if (/*location.pathname == "/"*/ !location.hash) {
		// history.replaceState(null, null, userid)
		location.hash = userid;
		return 'callerConnection'
	} else {
		return 'calleeConnection'
	}
}

function getCaller_uid(userid) {
	return location.hash ? location.hash.slice(1) : userid;
}

function UIInit() {
	const sendBtn = document.getElementById('send_message_btn');
	const chatNode = document.getElementById('chat')
	let templates = document.createElement('div')
	templates.innerHTML = document.getElementById('message_templates').innerHTML
	const my_msg_tmpl = templates.querySelector('.caller_message');
	const peer_msg_tmpl = templates.querySelector('.callee_message');
	const msg_inp = document.getElementById('message_input')
	const my_fingerprint_tag = document.getElementById('my_fingerprint')
	const counterpart_fingerprint_tag = document.getElementById('counterpart_fingerprint')

	const connection = callerConnection ? callerConnection : calleeConnection;

	if (connection && connection.localDescription) {
		const my_fingerprint = connection.localDescription.sdp.match(/fingerprint\S*\s(\S*)\r/i)[1];
		my_fingerprint_tag.textContent = my_fingerprint.split(':').join(' ');
	}

	if (connection && connection.remoteDescription) {
		const counterpart_fingerprint = connection.remoteDescription.sdp.match(/fingerprint\S*\s(\S*)\r/i)[1];
		counterpart_fingerprint_tag.textContent = counterpart_fingerprint.split(':').join(' ');;
	}

	setOnMessage(function (data) {
		let msgNode = peer_msg_tmpl;
		msgNode.querySelector('.text_cntr').textContent = data;
		chatNode.appendChild(msgNode)

	})

	sendBtn.addEventListener('click', function (e) {
		let data = msg_inp.value;
		sendMsg(data)

		let msgNode = my_msg_tmpl;
		msgNode.querySelector('.text_cntr').textContent = data;
		chatNode.appendChild(msgNode)

		msg_inp.value = '';
	})

}