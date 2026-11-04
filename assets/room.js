/* Hatille live room: shared settings for /room (client) and /studio (Crystel).
   Video and sound go directly between the two browsers (peer to peer, encrypted).
   The free PeerJS service only helps the two browsers find each other; it never sees the video. */
window.HROOM = {
  hostId: 'hatille-room-22fe8441f68f',
  peerOptions: {
    debug: 0,
    config: { iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' }
    ] }
  },
  media: { video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }, audio: { echoCancellation: true, noiseSuppression: true } }
};
