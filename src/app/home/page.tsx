"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "../../components/layout/Header";
import { getAuthHeaders } from "@/lib/api";
import Footer from "@/components/layout/Footer";
import { useAuth } from "@/hooks/AuthContext";

// Safe imports with fallbacks
const SafeComponent = ({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) => {
  try {
    return <>{children}</>;
  } catch (error) {
    console.error("Component render error:", error);
    return <>{fallback}</>;
  }
};

const Home = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { user: authUser, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading) {
      setAuthReady(true);
      setLoading(false);
    }
  }, [authLoading, authUser]);

  const handleConvert = async (playlistUrl: string) => {
    if (!playlistUrl.trim()) {
      alert("Please enter a valid playlist URL.");
      return;
    }

    if (!authUser) {
      router.push("/login");
      return;
    }

    try {
      const headers = await getAuthHeaders();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const response = await fetch(`${apiUrl}/api/convert`, {
        method: "POST",
        headers,
        body: JSON.stringify({ playlistUrl }),
      });

      const data = await response.json();

      if (response.status === 409) {
        if (data.courseId) {
          setIsModalOpen(false);
          alert("This course already exists! Redirecting...");
          router.push(`/course/${encodeURIComponent(data.courseId)}`);
        } else {
          throw new Error("Conflict occurred, but no courseId provided.");
        }
        return;
      }

      if (!response.ok) throw new Error(data?.message || "API request failed");
      if (!data.courseId) throw new Error("No course ID received");

      setIsModalOpen(false);
      router.push(`/course/${encodeURIComponent(data.courseId)}`);
    } catch (err) {
      console.error("Conversion error:", err);
      alert("Something went wrong while converting the playlist.");
    }
  };

  const handleModalToggle = () => setIsModalOpen((prev) => !prev);

  const handleTryNowClick = () => {
    if (authUser) {
      handleModalToggle();
    } else {
      router.push("/login");
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <Header />
      <SafeComponent fallback={<div>Error loading page</div>}>
        <div className="min-h-screen bg-gray-50 font-sans">

          {/* --- Hero Section --- */}
          <section className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-indigo-600 to-purple-700 pt-16 pb-20 lg:pt-20 lg:pb-24">
            {/* Dynamic Background & Icons */}
            <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
              {/* Blobs */}
              <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-500/30 rounded-full blur-[100px] animate-pulse-slow"></div>
              <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-500/30 rounded-full blur-[100px] animate-pulse-slow delay-1000"></div>

              {/* Floating Icons */}
              <div className="absolute top-20 left-[10%] text-white/10 text-6xl animate-float-slow">
                <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3L1 9l11 6 9-4.91V17h2V9M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" /></svg>
              </div>
              <div className="absolute bottom-32 right-[10%] text-white/10 text-6xl animate-float-delayed">
                <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2zm4-8H9V5h10v2z" /></svg>
              </div>
              <div className="absolute top-40 right-[20%] text-white/5 text-5xl animate-float-slow">
                <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              </div>

              {/* Grid Pattern Overlay */}
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
            </div>

            <div className="container mx-auto px-4 relative z-10">
              <div className="flex flex-col items-center text-center space-y-5 max-w-4xl mx-auto">

                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.1] drop-shadow-md">
                  Turn YouTube Playlists <br className="hidden md:block" />
                  into <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-purple-200">Interactive Courses</span>
                </h1>

                <p className="text-base md:text-lg text-blue-100/90 max-w-2xl leading-relaxed font-medium">
                  Stop watching scattered videos. Start structured learning. <br className="hidden md:block" />
                  Track progress, take notes, and master skills faster.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 pt-4 w-full sm:w-auto items-center justify-center">
                  <button
                    onClick={handleTryNowClick}
                    className="group relative px-6 py-3 bg-white text-blue-700 rounded-full font-bold text-base shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 overflow-hidden w-full sm:w-auto"
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      Create Course Free
                      <svg className="w-4 h-4 text-blue-600 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                    </span>
                  </button>

                  <Link
                    href={authUser ? "/mycourses" : "/login"}
                    className="px-6 py-3 bg-white/10 text-white border border-white/20 rounded-full font-bold text-base backdrop-blur-md hover:bg-white/20 hover:border-white/30 transition-all duration-300 flex items-center justify-center gap-2 w-full sm:w-auto"
                  >
                    <span>My Dashboard</span>
                  </Link>
                </div>

                {/* Floating Glass Cards (Visual Interest) */}
                <div className="pt-10 flex justify-center gap-4 md:gap-6">
                  <div className="hidden md:flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 backdrop-blur-md shadow-lg transform -rotate-2 hover:rotate-0 transition-transform duration-500">
                    <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-200">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" /></svg>
                    </div>
                    <div className="text-left">
                      <div className="text-[10px] text-blue-200">Source</div>
                      <div className="text-xs font-bold text-white">YouTube</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/20 border border-white/30 backdrop-blur-md shadow-xl z-10 scale-105">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-200">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </div>
                    <div className="text-left">
                      <div className="text-[10px] text-blue-100">Result</div>
                      <div className="text-xs font-bold text-white">Structured Course</div>
                    </div>
                  </div>
                  <div className="hidden md:flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 backdrop-blur-md shadow-lg transform rotate-2 hover:rotate-0 transition-transform duration-500">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-200">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div className="text-left">
                      <div className="text-[10px] text-blue-200">Goal</div>
                      <div className="text-xs font-bold text-white">Mastery</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* --- How It Works Section --- */}
          <section className="py-24 bg-white relative">
            <div className="container mx-auto px-4">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">Get started in seconds. No complicated setup required.</p>
              </div>

              <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {[
                  {
                    icon: "🔗",
                    title: "1. Paste URL",
                    desc: "Copy any YouTube playlist URL and paste it into our converter.",
                    color: "bg-blue-50 text-blue-600"
                  },
                  {
                    icon: "✨",
                    title: "2. Magic Transform",
                    desc: "We instantly organize videos into a clean, distraction-free course layout.",
                    color: "bg-purple-50 text-purple-600"
                  },
                  {
                    icon: "📈",
                    title: "3. Track Progress",
                    desc: "Mark videos as done and visualize your learning journey automatically.",
                    color: "bg-green-50 text-green-600"
                  }
                ].map((item, i) => (
                  <div key={i} className="group p-8 rounded-2xl bg-white border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    <div className={`w-16 h-16 rounded-2xl ${item.color} flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform duration-300`}>
                      {item.icon}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                    <p className="text-gray-600 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* --- CTA Section --- */}
          <section className="py-20 bg-gray-50">
            <div className="container mx-auto px-4">
              <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-700 shadow-2xl max-w-5xl mx-auto">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                <div className="relative z-10 px-8 py-16 md:p-20 text-center">
                  <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
                    Ready to Start Learning?
                  </h2>
                  <p className="text-blue-100 text-lg md:text-xl mb-10 max-w-2xl mx-auto">
                    Stop getting distracted by YouTube recommendations. Create your focused learning environment today.
                  </p>
                  <button
                    onClick={handleTryNowClick}
                    className="px-10 py-4 bg-white text-blue-700 rounded-full font-bold text-lg shadow-lg hover:bg-gray-50 hover:scale-105 transition-all duration-300"
                  >
                    Get Started Now
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* --- Modal --- */}
          {isModalOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
              <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg transform transition-all scale-100">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">Convert Playlist</h3>
                  <button onClick={handleModalToggle} className="text-gray-400 hover:text-gray-600">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">YouTube Playlist URL</label>
                    <input
                      type="text"
                      placeholder="https://www.youtube.com/playlist?list=..."
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleConvert(e.currentTarget.value);
                        }
                      }}
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => {
                        const input = document.querySelector("input[type='text']") as HTMLInputElement;
                        handleConvert(input?.value || "");
                      }}
                      className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
                    >
                      Create Course
                    </button>
                    <button
                      onClick={handleModalToggle}
                      className="px-6 py-3 rounded-xl font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </SafeComponent>
    </>
  );
};

export default Home;
