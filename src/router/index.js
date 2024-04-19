import Vue from "vue";
import Router from "vue-router";
import Home from "../views/Home.vue";

Vue.use(Router);

const router = new Router({
  routes: [
    {
      path: "/",
      component: Home,
    },
  ],
  mode: "history",
});

router.beforeEach((to, from, next) => {
  loginAuth(to, from, next);
});

router.afterEach((to, from) => {});

function loginAuth(to, from, next) {
  if (process.env.VUE_APP_ROUTER_CONTROL === "off") {
    return;
  }
  next();
}

export default router;
