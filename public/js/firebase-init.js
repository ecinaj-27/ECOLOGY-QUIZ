import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCpmZu0DWgZiEAmh4pbCOTbIZT07Qyx2Xk",
  authDomain: "ecology-quiz-d70f0.firebaseapp.com",
  projectId: "ecology-quiz-d70f0",
  storageBucket: "ecology-quiz-d70f0.firebasestorage.app",
  messagingSenderId: "142698405028",
  appId: "1:142698405028:web:eef0dd38b95966cdad9a31"
};

try {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  window.db = db;
  window.firebaseAdd = addDoc;
  window.firebaseGet = getDocs;
  window.firebaseCollection = collection;
} catch (error) {
  console.error("Firebase init failed:", error);
}
