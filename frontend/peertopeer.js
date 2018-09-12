let db;
let user_id;
let caller_uid = false;
let callerCandidate;
let calleeCandidate;
const RTCConConfig = null;
let callerConnection;
let calleeConnection;
let callerDataChannel;
let p_type;

function WebRTCInit(database, peer_type, uid) {
	db = database;
	p_type = peer_type;

	if (peer_type == 'callerConnection') {
		callerConnection = new RTCPeerConnection(RTCConConfig);
		user_id = uid;
		callerDataChannel = callerConnection.createDataChannel('callerDataChannel');
		callerConnection.ondatachannel = event => event.channel.onmessage = e => console.log(e.data)
		ICECandidateProcessing()
		return generateHandshake()
			.then(persistHandshake)
			.then(getAnswer)

	} else if (peer_type == 'calleeConnection') {
		calleeConnection = new RTCPeerConnection(RTCConConfig)
		calleeDataChannel = calleeConnection.createDataChannel('calleeDataChannel');
		calleeConnection.ondatachannel = event => event.channel.onmessage = e => console.log(e.data)
		caller_uid = uid;
		ICECandidateProcessing()
		return getHandshake()
			.then(generateAnswer)
			.then(persistAnswer)
	}
}

function setOnMessage(onMessageHandler) {
	if (p_type == 'callerConnection') {
		callerConnection.ondatachannel = event => event.channel.onmessage = e => onMessageHandler(e.data)
	} else if (p_type == 'calleeConnection') {
		calleeConnection.ondatachannel = event => event.channel.onmessage = e => onMessageHandler(e.data)
	}
}

function sendMsg(msg) {
	if (p_type == 'callerConnection') {
		callerDataChannel.send(msg)
	} else if (p_type == 'calleeConnection') {
		calleeDataChannel.send(msg)
	}
}

function generateHandshake() {
	return callerConnection.createOffer()
		.then(function (offer) {
			// console.log(offer)
			return callerConnection.setLocalDescription(offer)
		})
}

function persistHandshake() {
	let ld = callerConnection.localDescription;
	return db.ref(`chats/${user_id}`).set({
		handshake: { type: ld.type, sdp: ld.sdp },
		answer: false,
		callerICECandidate: false,
		calleeICECandidate: false
	})
}

function getHandshake() {
	let uid = caller_uid;

	return db.ref(`chats/${uid}/handshake`).once('value')
		.then(function (offer) {
			console.log(offer.val())
			return calleeConnection.setRemoteDescription(offer.val())
		}).then(() => db.ref(`chats/${caller_uid}/callerICECandidate`).on('value', getICECandidate))

}

function generateAnswer() {

	return calleeConnection.createAnswer()
		.then(function (answer) {
			console.log(answer)
			return calleeConnection.setLocalDescription(answer)
		})

}

function persistAnswer(clr_uid) {
	let uid = clr_uid ? clr_uid : caller_uid;
	let ld = calleeConnection.localDescription;
	console.log(ld)
	return db.ref(`chats/${uid}/answer`).set({ sdp: ld.sdp, type: ld.type })

}

function getAnswer() {
	return new Promise(function (resolve) {
		db.ref(`chats/${user_id}/answer`).on('value', function listener(answer) {
			if (answer.val()) {
				db.ref(`chats/${user_id}/answer`).off('value', listener)
				resolve(callerConnection.setRemoteDescription(answer.val()))
			}

		})
	}).then(() => db.ref(`chats/${user_id}/calleeICECandidate`).on('value', getICECandidate))

}

function ICECandidateProcessing() {

	let peer = caller_uid ? calleeConnection : callerConnection;
	let ICECandidate = caller_uid ? 'callerICECandidate' : 'calleeICECandidate';

	peer.addEventListener('icecandidate', onCallerICECandidate)

	let uid = caller_uid ? caller_uid : user_id;

	console.log(peer, ICECandidate, uid)
	// db.ref(`chats/${uid}/${ICECandidate}`).on('value', getICECandidate)

}

function onCallerICECandidate(e) {
	callerCandidate = e.candidate;
	let uid = caller_uid ? caller_uid : user_id;
	let ICECandidate = caller_uid ? 'calleeICECandidate' : 'callerICECandidate';
	console.log('candidate', callerCandidate)
	if (callerCandidate)
		db.ref(`chats/${uid}/${ICECandidate}`).set(JSON.stringify(callerCandidate))
}

function getICECandidate(candidate) {
	let peer = caller_uid ? calleeConnection : callerConnection;
	console.log(JSON.parse(candidate.val()), peer)
	if (candidate.val())
		peer.addIceCandidate(JSON.parse(candidate.val()))
			.catch(console.log)
}

function sendHelloMsg() {
	if (callerDataChannel && callerDataChannel.readyState == 'open')
		callerDataChannel.send('Hello! What\'s Up Man?!')
}