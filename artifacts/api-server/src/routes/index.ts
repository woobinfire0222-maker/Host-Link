import { Router, type IRouter } from "express";
import healthRouter from "./health";
import { sitesRouter } from "./sites";
import { sitedbRouter } from "./sitedb";
import { authRouter } from "./auth";
import { adminRouter } from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(adminRouter);
router.use(sitesRouter);
router.use(sitedbRouter);

export default router;
