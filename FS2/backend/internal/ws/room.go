package ws

import (
	"log"
	"sync"
)

const (
	MsgSyncUpdate   byte = 0x00
	MsgAwareness    byte = 0x01
	MsgRequestState byte = 0x02
	MsgFullState    byte = 0x03
)

type Store interface {
	SaveUpdates(workspaceID string, updates [][]byte) error
	LoadUpdates(workspaceID string) ([][]byte, error)
}

type Room struct {
	ID      string
	clients map[*Client]bool
	mu      sync.RWMutex
	store   Store
	buffer  [][]byte
	bufMu   sync.Mutex
}

type RoomManager struct {
	rooms map[string]*Room
	mu    sync.RWMutex
	store Store
}

func NewRoomManager(store Store) *RoomManager {
	return &RoomManager{
		rooms: make(map[string]*Room),
		store: store,
	}
}

func (rm *RoomManager) GetOrCreate(workspaceID string) *Room {
	rm.mu.Lock()
	defer rm.mu.Unlock()

	if room, ok := rm.rooms[workspaceID]; ok {
		return room
	}

	room := &Room{
		ID:      workspaceID,
		clients: make(map[*Client]bool),
		store:   rm.store,
	}
	rm.rooms[workspaceID] = room
	return room
}

func (rm *RoomManager) Remove(workspaceID string) {
	rm.mu.Lock()
	defer rm.mu.Unlock()
	delete(rm.rooms, workspaceID)
}

func (r *Room) Join(client *Client) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.clients[client] = true
	log.Printf("client joined room %s (total: %d)", r.ID, len(r.clients))
}

func (r *Room) Leave(client *Client) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, ok := r.clients[client]; ok {
		delete(r.clients, client)
		close(client.send)
		log.Printf("client left room %s (total: %d)", r.ID, len(r.clients))

		if len(r.clients) == 0 {
			r.flushBuffer()
		}
	}
}

func (r *Room) HandleMessage(sender *Client, msg []byte) {
	if len(msg) == 0 {
		return
	}

	msgType := msg[0]
	payload := msg[1:]

	switch msgType {
	case MsgSyncUpdate:
		update := make([]byte, len(payload))
		copy(update, payload)

		r.bufMu.Lock()
		r.buffer = append(r.buffer, update)
		r.bufMu.Unlock()

		r.broadcast(sender, msg)

	case MsgAwareness:
		r.broadcast(sender, msg)

	case MsgRequestState:
		r.sendFullState(sender)
	}
}

func (r *Room) broadcast(sender *Client, msg []byte) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for client := range r.clients {
		if client != sender {
			select {
			case client.send <- msg:
			default:
				go func(c *Client) {
					r.Leave(c)
				}(client)
			}
		}
	}
}

func (r *Room) sendFullState(client *Client) {
	updates, err := r.store.LoadUpdates(r.ID)
	if err != nil {
		log.Printf("error loading state for room %s: %v", r.ID, err)
		return
	}

	r.bufMu.Lock()
	buffered := make([][]byte, len(r.buffer))
	copy(buffered, r.buffer)
	r.bufMu.Unlock()

	allUpdates := append(updates, buffered...)

	for _, update := range allUpdates {
		msg := make([]byte, 1+len(update))
		msg[0] = MsgFullState
		copy(msg[1:], update)

		select {
		case client.send <- msg:
		default:
			return
		}
	}
}

func (r *Room) flushBuffer() {
	r.bufMu.Lock()
	defer r.bufMu.Unlock()

	if len(r.buffer) == 0 {
		return
	}

	if err := r.store.SaveUpdates(r.ID, r.buffer); err != nil {
		log.Printf("error flushing buffer for room %s: %v", r.ID, err)
		return
	}

	log.Printf("flushed %d updates for room %s", len(r.buffer), r.ID)
	r.buffer = nil
}

func (r *Room) PeriodicFlush() {
	r.flushBuffer()
}

func (rm *RoomManager) FlushAll() {
	rm.mu.RLock()
	defer rm.mu.RUnlock()

	for _, room := range rm.rooms {
		room.PeriodicFlush()
	}
}
