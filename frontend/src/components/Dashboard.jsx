import { useState } from "react";
import { generatePeer } from "../services/api";

function Dashboard() {
  const [qr, setQr] = useState(null);

  const handleConnect = async () => {
    const data = await generatePeer();
    setQr(data.qr);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center">

      <h1 className="text-3xl font-bold mb-6">VPN Dashboard</h1>

      <button
        onClick={handleConnect}
        className="bg-blue-500 px-6 py-2 rounded-lg hover:bg-blue-600"
      >
        Connect
      </button>

      {qr && (
        <div className="mt-6 bg-white p-4 rounded">
          <img src={qr} alt="QR Code" />
        </div>
      )}
    </div>
  );
}

export default Dashboard;