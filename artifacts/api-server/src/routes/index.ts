import { Router, type IRouter } from "express";
import healthRouter from "./health";
import { sitesRouter } from "./sites";
import { sitedbRouter } from "./sitedb";

const router: IRouter = Router();

router.use(healthRouter);
router.use(sitesRouter);
router.use(sitedbRouter);

export default router;
