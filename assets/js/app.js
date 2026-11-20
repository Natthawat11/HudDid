(() => {
  const cfg = window.HUDDID_CONFIG || {};
  const ready = !!(cfg.supabaseUrl && cfg.supabaseAnonKey && !cfg.supabaseUrl.includes("YOUR-"));
  let client = null;
  if (ready && window.supabase?.createClient) client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  const $ = (s) => document.querySelector(s);
  const message = (text, error=false) => { const el=$("#message"); if(el){el.textContent=text;el.classList.remove("hidden","error");if(error)el.classList.add("error");} };
  window.HudDid = {
    configured: !!client,
    async signUp(email,password,name){
      if(!client) throw new Error("ระบบสมาชิกยังไม่ได้ตั้งค่า Supabase");
      const {data,error}=await client.auth.signUp({email,password,options:{data:{display_name:name}}});
      if(error) throw error; return data;
    },
    async signIn(email,password){
      if(!client) throw new Error("ระบบสมาชิกยังไม่ได้ตั้งค่า Supabase");
      const {data,error}=await client.auth.signInWithPassword({email,password});
      if(error) throw error; return data;
    },
    async signOut(){if(client) await client.auth.signOut();location.href="index.html";},
    async currentUser(){if(!client)return null;const {data}=await client.auth.getUser();return data.user||null;},
    async getLessons(){
      if(!client)return [];
      const {data,error}=await client.from("lessons").select("id,title,slug,level,summary,content,sort_order").eq("published",true).order("sort_order");
      if(error)throw error;return data||[];
    },
    async saveProgress(lessonId,completed=true){
      if(!client)throw new Error("ระบบสมาชิกยังไม่ได้ตั้งค่า");
      const user=await this.currentUser();if(!user)throw new Error("กรุณาเข้าสู่ระบบก่อนบันทึกความคืบหน้า");
      const {error}=await client.from("lesson_progress").upsert({user_id:user.id,lesson_id:lessonId,completed,updated_at:new Date().toISOString()},{onConflict:"user_id,lesson_id"});
      if(error)throw error;
    },
    async isAdmin(){
      if(!client)return false;const user=await this.currentUser();if(!user)return false;
      const {data,error}=await client.from("profiles").select("role").eq("id",user.id).maybeSingle();
      return !error && data?.role==="admin";
    },
    async adminCreateLesson(lesson){
      if(!client || !(await this.isAdmin()))throw new Error("ต้องใช้บัญชีผู้ดูแลระบบ");
      const {data,error}=await client.from("lessons").insert(lesson).select().single();if(error)throw error;return data;
    }
  };
  document.addEventListener("DOMContentLoaded", async()=>{
    const status=$("#backend-status");if(status)status.textContent=client?"ระบบสมาชิกเชื่อมต่อแล้ว":"โหมดตัวอย่าง: รอตั้งค่า Supabase";
    const signup=$("#signup-form");if(signup)signup.addEventListener("submit",async e=>{e.preventDefault();try{await HudDid.signUp($("#name").value,$("#email").value,$("#password").value);message("สมัครสมาชิกเรียบร้อย หากเปิดยืนยันอีเมล โปรดตรวจกล่องจดหมาย");}catch(err){message(err.message,true);}});
    const login=$("#login-form");if(login)login.addEventListener("submit",async e=>{e.preventDefault();try{await HudDid.signIn($("#email").value,$("#password").value);location.href="dashboard.html";}catch(err){message(err.message,true);}});
    const logout=$("#logout");if(logout)logout.addEventListener("click",()=>HudDid.signOut());
    const dashboard=$("#dashboard");if(dashboard){
      const user=await HudDid.currentUser();if(!user){location.href="login.html";return;}
      $("#welcome").textContent="ยินดีต้อนรับ "+(user.user_metadata?.display_name||user.email);
      try{const lessons=await HudDid.getLessons();$("#lesson-count").textContent=lessons.length+" บทเรียน";}catch(e){message(e.message,true);}
      if(await HudDid.isAdmin())$("#admin-link")?.classList.remove("hidden");
    }
    const admin=$("#admin-page");if(admin){
      const user=await HudDid.currentUser();if(!user){location.href="login.html";return;}
      if(!(await HudDid.isAdmin())){message("บัญชีนี้ไม่มีสิทธิ์ผู้ดูแลระบบ",true);return;}
      $("#admin-form")?.addEventListener("submit",async e=>{e.preventDefault();try{
        await HudDid.adminCreateLesson({title:$("#lesson-title").value,slug:$("#lesson-slug").value,level:$("#lesson-level").value,summary:$("#lesson-summary").value,content:$("#lesson-content").value,published:true,sort_order:Number($("#lesson-order").value||0)});
        message("เพิ่มบทเรียนแล้ว");e.target.reset();
      }catch(err){message(err.message,true);}});
    }
  });
})();
