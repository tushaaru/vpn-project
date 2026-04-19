const BASE_URL = "http://localhost:5000";

export const generatePeer = async () => {
  const res = await fetch(`${BASE_URL}/generate-peer`, {
    method: "POST",
  });
  return res.json();
};