import ChatbotWidget from "../components/ChatbotWidget";

export default function Home() {
  return (
    <div style={styles.page}>
      <h1>LogonBroadband</h1>
      <p>Fast internet, easy support, and smart customer care.</p>
      <ChatbotWidget />
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "40px",
    background: "#f5f7fb",
    fontFamily: "Arial, sans-serif",
  },
};