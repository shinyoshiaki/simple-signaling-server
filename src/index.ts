import socketio from "socket.io";
import http from "http";

console.log("start");

const srv = new http.Server();
const io = socketio(srv);
srv.listen(process.env.PORT || 20000);

const roomList: { [key: string]: { hostId: string; guestId: string } } = {};

io.on("connection", socket => {
  console.log("connection");

  socket.on("create", data => {
    const roomId = data.room;
    console.log("create", roomId);
    roomList[roomId] = { hostId: socket.id, guestId: "" };
    console.log("roomList", roomList);
  });

  socket.on("connect", (data: { room: string }) => {
    const roomId = data.room;
    console.log("connected", roomId, socket.id);
    delete roomList[roomId];
    console.log("roomList", roomList);
    const { hostId, guestId } = roomList[roomId];
    io.sockets.sockets[hostId].disconnect();
    io.sockets.sockets[guestId].disconnect();
  });

  socket.on("join", (data: { room: string }) => {
    const roomId = data.room;
    if (Object.keys(roomList).includes(roomId)) {
      try {
        console.log("join", roomId);
        const room = roomList[roomId];
        room.guestId = socket.id;
        console.log("roomList", roomList);
        io.sockets.sockets[socket.id].emit("join", { room: roomId });
      } catch (error) {
        console.log(error);
      }
    }
  });

  socket.on("offer", (data: { room: string; sdp: string }) => {
    try {
      const roomId = data.room;
      const sdp = data.sdp;
      console.log("offer", roomId);
      const room = roomList[roomId];
      io.sockets.sockets[room.hostId].emit("offer", { sdp });
    } catch (error) {
      console.log(error);
    }
  });

  socket.on("answer", (data: { room: string; sdp: string }) => {
    try {
      const roomId = data.room;
      const sdp = data.sdp;
      console.log("answer", roomId);
      const room = roomList[roomId];
      io.sockets.sockets[room.guestId].emit("answer", { sdp });
    } catch (error) {
      console.log(error);
    }
  });

  socket.on(
    "ice",
    (data: {
      room: string;
      candidate: string;
      sdpMline: string;
      sdpMid: string;
    }) => {
      try {
        const roomId = data.room;
        const candidate = data.candidate;
        const sdpMline = data.sdpMline;
        const sdpMid = data.sdpMid;
        console.log("ice", roomId);
        const room = roomList[roomId];
        if (socket.id === room.hostId) {
          if (io.sockets.sockets[room.guestId])
            io.sockets.sockets[room.guestId].emit("ice", {
              candidate,
              sdpMline,
              sdpMid
            });
        } else {
          if (io.sockets.sockets[room.hostId])
            io.sockets.sockets[room.hostId].emit("ice", {
              candidate,
              sdpMline,
              sdpMid
            });
        }
      } catch (error) {
        console.log(error);
      }
    }
  );
});
