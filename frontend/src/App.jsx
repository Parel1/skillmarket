import {
    BrowserRouter,
    Routes,
    Route,
} from "react-router-dom";

import Home from "./pages/Home";
import Jasa from "./pages/Jasa";
import Detail from "./pages/Detail";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import Pesanan from "./pages/Pesanan";
import FreelancerOrders from "./pages/FreelancerOrders";
import Chat from "./pages/Chat";
import TambahJasa from "./pages/TambahJasa";
import Favorites from "./pages/Favorites";
import DashboardFreelancer from "./pages/DashboardFreelancer";
import DashboardAdmin from "./pages/DashboardAdmin";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/jasa" element={<Jasa />} />
                <Route path="/detail/:id" element={<Detail />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/pesanan" element={<Pesanan />} />
                <Route
                    path="/freelancer-orders"
                    element={<FreelancerOrders />}
                />
                <Route path="/chat" element={<Chat />} />
                <Route
                    path="/chat/:conversationId"
                    element={<Chat />}
                />
                <Route
                    path="/tambah-jasa"
                    element={<TambahJasa />}
                />
                <Route path="/favorit" element={<Favorites />} />
                <Route
                    path="/dashboard-freelancer"
                    element={<DashboardFreelancer />}
                />
                <Route
                    path="/admin"
                    element={<DashboardAdmin />}
                />
            </Routes>
        </BrowserRouter>
    );
}

export default App;