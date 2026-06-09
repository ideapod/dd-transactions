import { Outlet } from "react-router-dom";
import Navbar from "./components/Navbar";

const App = () => {
  return (
    <div className="flex min-h-screen">
      <Navbar />
      <main className="flex-1 min-w-0 overflow-x-hidden p-8 bg-gray-50">
        <Outlet />
      </main>
    </div>
  );
};
export default App