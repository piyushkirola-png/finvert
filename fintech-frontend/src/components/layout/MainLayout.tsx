import { Outlet } from "react-router-dom";
import AppSidebar from "../sidebar/AppSidebar";
import SessionTimer from "../ui/SessionTimer";

export default function MainLayout() {
  return (
    <div className="min-h-screen flex bg-[#faf8f3]">
      <AppSidebar />
      <div className="flex-1 overflow-hidden">
        <main className="h-screen overflow-y-auto">
          <div className="mx-auto w-full max-w-[1600px] px-6 py-6">
            <Outlet />
          </div>
        </main>
      </div>
      <SessionTimer />
    </div>
  );
}