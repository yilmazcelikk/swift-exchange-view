import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

const Blocked = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to login after a moment, as if session expired
    const timer = setTimeout(() => {
      navigate("/login", { replace: true });
    }, 100);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );
};

export default Blocked;
