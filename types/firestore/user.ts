import {
  DocumentData,
  FieldValue,
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  WithFieldValue,
} from "firebase/firestore"

// Document — what you read from Firestore (after conversion)
export interface User {
  id: string
  codename: string
  createdAt: Date
  lastLoggedIn: Date | null
}

// Create Input — what you pass to setDoc
export interface CreateUserInput {
  id: string
  codename: string
  createdAt: FieldValue // serverTimestamp()
}

// Update Input — partial fields for updateDoc
export interface UpdateUserInput {
  codename?: string
  lastLoggedIn?: FieldValue // serverTimestamp()
}

export const userConverter: FirestoreDataConverter<User> = {
  toFirestore: (data: WithFieldValue<User>): DocumentData => data,
  fromFirestore: (snapshot: QueryDocumentSnapshot): User =>
    ({
      id: snapshot.id,
      ...snapshot.data(),
      createdAt: snapshot.data().createdAt?.toDate(),
      lastLoggedIn: snapshot.data().lastLoggedIn?.toDate() ?? null,
    }) as User,
}
