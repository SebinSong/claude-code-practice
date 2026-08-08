import {
  DocumentData,
  FieldValue,
  QueryDocumentSnapshot,
} from "firebase/firestore"

export type HeistFinalStatus = "success" | "failure"

// Document — what you read from Firestore (after conversion)
export interface Heist {
  id: string
  createdAt: Date
  title: string
  description: string
  createdBy: string
  createdByCodename: string
  assignedTo: string
  assignedToCodename: string
  deadline: Date
  finalStatus: HeistFinalStatus | null
}

// Create Input — what you pass to addDoc
export interface CreateHeistInput {
  createdAt: FieldValue // serverTimestamp()
  title: string
  description: string
  createdBy: string
  createdByCodename: string
  assignedTo: string
  assignedToCodename: string
  deadline: Date // computed client-side as 48 hours from creation
  finalStatus: null
}

// Update Input — partial fields for updateDoc (no createdAt)
export interface UpdateHeistInput {
  title?: string
  description?: string
  createdBy?: string
  createdByCodename?: string
  assignedTo?: string
  assignedToCodename?: string
  deadline?: Date
  finalStatus?: HeistFinalStatus | null
}

export const heistConverter = {
  toFirestore: (data: Partial<Heist>): DocumentData => data,
  fromFirestore: (snapshot: QueryDocumentSnapshot): Heist =>
    ({
      id: snapshot.id,
      ...snapshot.data(),
      createdAt: snapshot.data().createdAt?.toDate(),
      deadline: snapshot.data().deadline?.toDate(),
    }) as Heist,
}
