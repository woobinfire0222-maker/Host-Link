import { Router, type IRouter } from "express";
import healthRouter from "./health";
import { sitesRouter } from "./sites";
import { sitedbRouter } from "./sitedb";
import { authRouter } from "./auth";
import { adminRouter } from "./admin";
import { botsRouter } from "./bots";
import { paymentsRouter } from "./payments";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(adminRouter);
router.use(sitesRouter);
router.use(sitedbRouter);
router.use(botsRouter);
router.use(paymentsRouter);

export default router;
