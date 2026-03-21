import { db } from './firebase';
import { collection, doc, getDocs, getDoc, setDoc, addDoc, updateDoc, deleteDoc, query, where, serverTimestamp } from 'firebase/firestore';

// --- Admins ---
export async function getAdmins() {
  const snapshot = await getDocs(collection(db, 'admins'));
  return snapshot.docs.map(doc => ({ email: doc.id, ...doc.data() }));
}

export async function addAdmin(email, data) {
  await setDoc(doc(db, 'admins', email), {
    ...data,
    createdAt: serverTimestamp()
  });
}

export async function removeAdmin(email) {
  await deleteDoc(doc(db, 'admins', email));
}

// --- Clubs ---
export async function getClubs() {
  const snapshot = await getDocs(collection(db, 'clubs'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function createClub(data) {
  const docRef = await addDoc(collection(db, 'clubs'), data);
  return docRef.id;
}

export async function updateClub(clubId, updates) {
  const docRef = doc(db, 'clubs', clubId);
  await updateDoc(docRef, updates);
}

export async function deleteClub(clubId) {
  await deleteDoc(doc(db, 'clubs', clubId));
}

// --- Events ---
export async function getEvents() {
  const snapshot = await getDocs(collection(db, 'events'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getEventsByUser(userId) { // Or email
  const q = query(collection(db, 'events'), where("userId", "==", userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getEvent(eventId) {
    const docRef = doc(db, 'events', eventId);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
        return { id: snapshot.id, ...snapshot.data() };
    }
    return null;
}

export async function createEvent(data) {
  const docRef = await addDoc(collection(db, 'events'), data);
  return docRef.id;
}

export async function updateEvent(eventId, updates) {
  const docRef = doc(db, 'events', eventId);
  await updateDoc(docRef, updates);
}

export async function deleteEvent(eventId) {
  await deleteDoc(doc(db, 'events', eventId));
}


// --- Inventory Stock ---
export async function getInventoryStock() {
  const snapshot = await getDocs(collection(db, 'inventoryStock'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function addStockItem(data) {
  const docRef = await addDoc(collection(db, 'inventoryStock'), {
    ...data,
    totalStock: data.totalStock || 0,
    issuedStock: data.issuedStock || 0,
    returnedStock: data.returnedStock || 0
  });
  return docRef.id;
}

// Update available stock: Total - Issued + Returned is calculated dynamically or stored
export async function updateStock(itemId, updates) {
  const docRef = doc(db, 'inventoryStock', itemId);
  await updateDoc(docRef, updates);
}

export async function deleteStockItem(itemId) {
  await deleteDoc(doc(db, 'inventoryStock', itemId));
}


// --- Transactions (Immutable Ledger) ---
export async function getTransactions() {
  const snapshot = await getDocs(collection(db, 'transactions'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function addTransaction(data) {
  await addDoc(collection(db, 'transactions'), {
    ...data,
    timestamp: serverTimestamp()
  });
}


// --- Tickets ---
export async function getTickets() {
  const snapshot = await getDocs(collection(db, 'tickets'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function createTicket(data) {
    await addDoc(collection(db, 'tickets'), {
        ...data,
        status: 'Open',
        timestamp: serverTimestamp()
    });
}

export async function updateTicketStatus(ticketId, status) {
    const docRef = doc(db, 'tickets', ticketId);
    await updateDoc(docRef, { status });
}

export async function deleteTicket(ticketId) {
  await deleteDoc(doc(db, 'tickets', ticketId));
}
