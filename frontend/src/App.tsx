import { GameProvider, useGame } from "./contexts/GameContext";
import { NicknameScreen } from "./components/NicknameScreen";
import { GameScreen } from "./components/GameScreen";

function AppContent() {
  const { isGameStarted } = useGame();
  return isGameStarted ? <GameScreen /> : <NicknameScreen />;
}

function App() {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
}

export default App;
