import { cookies } from "next/headers";
import AdminPanel from "./AdminPanel";
import AdminLoginForm from "./AdminLoginForm";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const adminCookie = cookieStore.get("porra_admin")?.value;
  const secret = process.env.ADMIN_SECRET;

  const isAuthenticated = !!(secret && adminCookie === secret);

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-4">
      {isAuthenticated ? (
        <div className="w-full max-w-4xl">
          <div className="mb-6">
            <h1 className="text-white font-bold text-2xl">Panel de Admin</h1>
            <p className="text-[#6b7280] text-sm mt-1">
              Introduce resultados manualmente cuando la API no esté disponible
            </p>
          </div>
          <AdminPanel />
        </div>
      ) : (
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-white font-bold text-2xl">Panel de Admin</h1>
            <p className="text-[#6b7280] text-sm mt-2">Introduce la contraseña de administrador</p>
          </div>
          <div className="bg-[#1a1d26] border border-[#2a2d3a] rounded-2xl p-6">
            <AdminLoginForm />
          </div>
        </div>
      )}
    </div>
  );
}

