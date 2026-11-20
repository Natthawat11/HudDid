(() => {
  const cfg = window.HUDDID_CONFIG || {};
  const ready = !!(cfg.supabaseUrl && cfg.supabaseAnonKey && !cfg.supabaseUrl.includes("YOUR-"));
  const client = ready && window.supabase?.createClient
    ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey)
    : null;
  const $ = (selector) => document.querySelector(selector);
  const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
  const message = (text, error = false) => {
    const el = $("#message");
    if (!el) return;
    el.textContent = text;
    el.classList.remove("hidden", "error");
    if (error) el.classList.add("error");
  };
  const requireClient = () => {
    if (!client) throw new Error("ระบบสมาชิกยังไม่ได้เชื่อมต่อ กรุณาตรวจสอบการตั้งค่า Supabase");
  };

  window.HudDid = {
    configured: !!client,
    async signUp(email, password, name) {
      requireClient();
      const { data, error } = await client.auth.signUp({
        email, password, options: { data: { display_name: name } }
      });
      if (error) throw error;
      return data;
    },
    async signIn(email, password) {
      requireClient();
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
    },
    async requestPasswordReset(email) {
      requireClient();
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/reset-password.html"
      });
      if (error) throw error;
    },
    async updatePassword(password) {
      requireClient();
      const { data, error } = await client.auth.updateUser({ password });
      if (error) throw error;
      return data;
    },
    async signOut() {
      if (client) {
        const { error } = await client.auth.signOut();
        if (error) throw error;
      }
      location.href = "index.html";
    },
    async currentUser() {
      if (!client) return null;
      const { data, error } = await client.auth.getUser();
      if (error) return null;
      return data.user || null;
    },
    async getLessons() {
      requireClient();
      const { data, error } = await client.from("lessons")
        .select("id,title,slug,level,summary,content,sort_order")
        .eq("published", true).order("sort_order");
      if (error) throw error;
      return data || [];
    },
    async getProgress() {
      requireClient();
      const user = await this.currentUser();
      if (!user) throw new Error("กรุณาเข้าสู่ระบบ");
      const { data, error } = await client.from("lesson_progress")
        .select("lesson_id,completed,updated_at").eq("user_id", user.id);
      if (error) throw error;
      return data || [];
    },
    async saveProgress(lessonId, completed = true) {
      requireClient();
      const user = await this.currentUser();
      if (!user) throw new Error("กรุณาเข้าสู่ระบบก่อนบันทึกความคืบหน้า");
      const { error } = await client.from("lesson_progress").upsert({
        user_id: user.id, lesson_id: lessonId, completed,
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id,lesson_id" });
      if (error) throw error;
    },
    async isAdmin() {
      if (!client) return false;
      const user = await this.currentUser();
      if (!user) return false;
      const { data, error } = await client.from("profiles")
        .select("role").eq("id", user.id).maybeSingle();
      return !error && data?.role === "admin";
    },
    async adminGetLessons() {
      if (!(await this.isAdmin())) throw new Error("ต้องใช้บัญชีผู้ดูแลระบบ");
      const { data, error } = await client.from("lessons")
        .select("id,title,slug,level,summary,content,published,sort_order")
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
    async adminSaveLesson(lesson, id = null) {
      if (!(await this.isAdmin())) throw new Error("ต้องใช้บัญชีผู้ดูแลระบบ");
      const query = id
        ? client.from("lessons").update(lesson).eq("id", id)
        : client.from("lessons").insert(lesson);
      const { error } = await query;
      if (error) throw error;
    },
    async adminDeleteLesson(id) {
      if (!(await this.isAdmin())) throw new Error("ต้องใช้บัญชีผู้ดูแลระบบ");
      const { error } = await client.from("lessons").delete().eq("id", id);
      if (error) throw error;
    }
  };

  document.addEventListener("DOMContentLoaded", async () => {
    const status = $("#backend-status");
    if (status) status.textContent = client ? "เชื่อมต่อระบบสมาชิกแล้ว" : "ยังไม่ได้เชื่อมต่อฐานข้อมูล";
    
    document.addEventListener("click", (event) => {
      const toggle = event.target.closest("[data-toggle-password]");
      if (!toggle) return;
      const input = document.getElementById(toggle.dataset.togglePassword);
      if (!input) return;
      const visible = input.type === "password";
      input.type = visible ? "text" : "password";
      toggle.textContent = visible ? "ซ่อน" : "แสดง";
    });

    const resetRequest = $("#reset-request-form");
    resetRequest?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submit = resetRequest.querySelector('[type="submit"]');
      if (submit) submit.disabled = true;
      try {
        await HudDid.requestPasswordReset($("#email").value.trim());
        message("ส่งลิงก์ตั้งรหัสผ่านใหม่แล้ว กรุณาตรวจอีเมลและโฟลเดอร์ Spam");
      } catch (error) { message(error.message, true); }
      finally { if (submit) submit.disabled = false; }
    });

    const resetForm = $("#reset-password-form");
    resetForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      if ($("#new-password").value !== $("#confirm-new-password").value) {
        message("รหัสผ่านทั้งสองช่องไม่ตรงกัน", true);
        return;
      }
      const submit = resetForm.querySelector('[type="submit"]');
      if (submit) submit.disabled = true;
      try {
        await HudDid.updatePassword($("#new-password").value);
        message("เปลี่ยนรหัสผ่านสำเร็จแล้ว");
        resetForm.reset();
      } catch (error) { message(error.message + " หากลิงก์หมดอายุ กรุณาขอลิงก์ใหม่", true); }
      finally { if (submit) submit.disabled = false; }
    });

    const signup = $("#signup-form");
    signup?.addEventListener("submit", async (event) => {
      event.preventDefault();
      if ($("#password").value !== $("#confirm-password").value) {
        message("รหัสผ่านทั้งสองช่องไม่ตรงกัน", true);
        return;
      }
      const submit = signup.querySelector('[type="submit"]');
      if (submit) submit.disabled = true;
      try {
        const data = await HudDid.signUp($("#email").value.trim(), $("#password").value, $("#name").value.trim());
        message(data.session
          ? "สมัครสมาชิกสำเร็จ กำลังเข้าสู่ห้องเรียน…"
          : "สมัครสมาชิกแล้ว กรุณาตรวจอีเมลเพื่อยืนยันบัญชีก่อนเข้าสู่ระบบ");
        if (data.session) location.href = "dashboard.html";
      } catch (error) { message(error.message, true); }
      finally { if (submit) submit.disabled = false; }
    });

    const login = $("#login-form");
    login?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submit = login.querySelector('[type="submit"]');
      if (submit) submit.disabled = true;
      try {
        await HudDid.signIn($("#email").value.trim(), $("#password").value);
        location.href = "dashboard.html";
      } catch (error) { message(error.message, true); }
      finally { if (submit) submit.disabled = false; }
    });

    const changePassword = $("#change-password-form");
    changePassword?.addEventListener("submit", async (event) => {
      event.preventDefault();
      if ($("#new-password").value !== $("#confirm-new-password").value) {
        message("รหัสผ่านทั้งสองช่องไม่ตรงกัน", true);
        return;
      }
      const submit = changePassword.querySelector('[type="submit"]');
      if (submit) submit.disabled = true;
      try {
        await HudDid.updatePassword($("#new-password").value);
        message("เปลี่ยนรหัสผ่านสำเร็จแล้ว");
        changePassword.reset();
      } catch (error) { message(error.message, true); }
      finally { if (submit) submit.disabled = false; }
    });

    $("#logout")?.addEventListener("click", async () => {
      try { await HudDid.signOut(); } catch (error) { message(error.message, true); }
    });

    const dashboard = $("#dashboard");
    if (dashboard) {
      const user = await HudDid.currentUser();
      if (!user) { location.href = "login.html"; return; }
      const welcome = $("#welcome");
      if (welcome) welcome.textContent = "ยินดีต้อนรับ " + (user.user_metadata?.display_name || user.email);
      try {
        const [lessons, progress] = await Promise.all([HudDid.getLessons(), HudDid.getProgress()]);
        const completed = progress.filter((item) => item.completed).length;
        const percent = lessons.length ? Math.round(completed / lessons.length * 100) : 0;
        if ($("#lesson-count")) $("#lesson-count").textContent = lessons.length + " บทเรียน";
        if ($("#progress-count")) $("#progress-count").textContent = completed + " / " + lessons.length + " บท";
        if ($("#progress-percent")) $("#progress-percent").textContent = percent + "%";
        if ($("#progress-bar")) $("#progress-bar").style.width = percent + "%";
        if ($("#dashboard-lessons")) {
          $("#dashboard-lessons").innerHTML = lessons.slice(0, 4).map((lesson, index) =>
            '<a class="lesson-row" href="lesson.html?slug=' + encodeURIComponent(lesson.slug) + '">' +
            '<span class="lesson-number">' + String(index + 1).padStart(2, "0") + '</span>' +
            '<div class="grow"><h3>' + escapeHTML(lesson.title) + '</h3><p>' + escapeHTML(lesson.summary) + '</p></div>' +
            '<span class="tag">เริ่มเรียน →</span></a>'
          ).join("");
        }
      } catch (error) { message(error.message, true); }
      if (await HudDid.isAdmin()) $("#admin-link")?.classList.remove("hidden");
    }

    const admin = $("#admin-page");
    if (admin) {
      const user = await HudDid.currentUser();
      if (!user) { location.href = "login.html"; return; }
      if (!(await HudDid.isAdmin())) { message("บัญชีนี้ไม่มีสิทธิ์ผู้ดูแลระบบ", true); return; }

      const form = $("#admin-form");
      const renderList = async () => {
        const lessons = await HudDid.adminGetLessons();
        const list = $("#admin-list");
        if (!list) return;
        list.innerHTML = lessons.map((lesson) =>
          '<div class="lesson-row"><div class="grow"><h3>' + escapeHTML(lesson.title) +
          '</h3><p>' + escapeHTML(lesson.level) + ' · ' + escapeHTML(lesson.slug) +
          ' · ' + (lesson.published ? "เผยแพร่" : "ฉบับร่าง") + '</p></div>' +
          '<button class="btn light" type="button" data-edit="' + lesson.id + '">แก้ไข</button>' +
          '<button class="btn light" type="button" data-delete="' + lesson.id + '">ลบ</button></div>'
        ).join("") || '<div class="notice">ยังไม่มีบทเรียน</div>';
        list.dataset.lessons = JSON.stringify(lessons);
      };

      form?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const submit = form.querySelector('[type="submit"]');
        if (submit) submit.disabled = true;
        try {
          const lesson = {
            title: $("#lesson-title").value.trim(),
            slug: $("#lesson-slug").value.trim(),
            level: $("#lesson-level").value,
            summary: $("#lesson-summary").value.trim(),
            content: $("#lesson-content").value.trim(),
            published: $("#lesson-published").checked,
            sort_order: Number($("#lesson-order").value || 0)
          };
          await HudDid.adminSaveLesson(lesson, $("#lesson-id").value || null);
          message("บันทึกบทเรียนเรียบร้อย");
          form.reset();
          $("#lesson-id").value = "";
          if ($("#admin-submit")) $("#admin-submit").textContent = "เพิ่มบทเรียน";
          await renderList();
        } catch (error) { message(error.message, true); }
        finally { if (submit) submit.disabled = false; }
      });

      $("#admin-list")?.addEventListener("click", async (event) => {
        const editId = event.target.closest("[data-edit]")?.dataset.edit;
        const deleteId = event.target.closest("[data-delete]")?.dataset.delete;
        try {
          const lessons = JSON.parse($("#admin-list").dataset.lessons || "[]");
          if (editId) {
            const lesson = lessons.find((item) => item.id === editId);
            if (!lesson) return;
            $("#lesson-id").value = lesson.id;
            $("#lesson-title").value = lesson.title;
            $("#lesson-slug").value = lesson.slug;
            $("#lesson-level").value = lesson.level;
            $("#lesson-summary").value = lesson.summary;
            $("#lesson-content").value = lesson.content;
            $("#lesson-order").value = lesson.sort_order;
            $("#lesson-published").checked = lesson.published;
            $("#admin-submit").textContent = "บันทึกการแก้ไข";
            form.scrollIntoView({ behavior: "smooth", block: "start" });
          } else if (deleteId && confirm("ต้องการลบบทเรียนนี้ใช่หรือไม่?")) {
            await HudDid.adminDeleteLesson(deleteId);
            message("ลบบทเรียนเรียบร้อย");
            await renderList();
          }
        } catch (error) { message(error.message, true); }
      });

      try { await renderList(); } catch (error) { message(error.message, true); }
    }
  });
})();
