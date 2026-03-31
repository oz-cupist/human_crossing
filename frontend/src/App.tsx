import { GameProvider } from "./contexts/GameContext";
import { NicknameScreen } from "./components/NicknameScreen";
import { PostLoginShell } from "./components/PostLoginShell";
import { useGame } from "./contexts/useGame";

function AppContent() {
  const { isGameStarted } = useGame();
  return isGameStarted ? <PostLoginShell /> : <NicknameScreen />;
}

function App() {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
}

export default App;
