import { Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import Account from "./pages/Account";
import CreatorDashboard from "./pages/CreatorDashboard";
import Home from "./pages/Home";
import Live from "./pages/Live";
import Login from "./pages/Login";
import Subscribe from "./pages/Subscribe";
import SubscribeForm from "./pages/SubscribeForm";
import Watch from "./pages/Watch";
import WatchHistory from "./pages/WatchHistory";
import AdminDashboard from "./pages/AdminDashboard";

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/watch/:id" element={<Watch />} />
        <Route path="/login" element={<Login />} />
        <Route path="/subscribe" element={<Subscribe />} />
        <Route path="/subscribe/form" element={<SubscribeForm />} />
        <Route path="/history" element={<WatchHistory />} />
        <Route path="/creator" element={<CreatorDashboard />} />
        <Route path="/live" element={<Live />} />
        <Route path="/account" element={<Account />} />
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </>
  );
}
