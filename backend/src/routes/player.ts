import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { playerService } from "../services/player.service";

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Position:
 *       type: object
 *       properties:
 *         x:
 *           type: number
 *           example: 0
 *         y:
 *           type: number
 *           example: 0
 *         z:
 *           type: number
 *           example: 0
 *     Player:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: "7a2c8c84-7d92-43c6-8ad6-aa9d96e273bb"
 *         nickname:
 *           type: string
 *           example: "플레이어1"
 *         joinedAt:
 *           type: string
 *           format: date-time
 *           example: "2026-03-15T07:53:32.643Z"
 *         lastPosition:
 *           $ref: '#/components/schemas/Position'
 *     JoinResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: "환영합니다!"
 *         player:
 *           $ref: '#/components/schemas/Player'
 *         isNew:
 *           type: boolean
 *           example: true
 *     Error:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           example: "닉네임을 입력해주세요."
 */

/**
 * @swagger
 * /api/players/join:
 *   post:
 *     summary: 닉네임으로 가입 또는 로그인
 *     description: 닉네임이 없으면 신규 가입, 있으면 로그인 처리 (lastLoginAt 갱신)
 *     tags: [Players]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nickname
 *             properties:
 *               nickname:
 *                 type: string
 *                 example: "플레이어1"
 *                 description: 1~20자 닉네임
 *     responses:
 *       201:
 *         description: 신규 가입 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JoinResponse'
 *       200:
 *         description: 기존 유저 로그인 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/JoinResponse'
 *       400:
 *         description: 닉네임 유효성 검증 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: 닉네임 중복 (race condition)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: 서버 에러
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  "/join",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await playerService.join(req.body.nickname);
      const statusCode = result.isNew ? 201 : 200;
      res.status(statusCode).json(result);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @swagger
 * /api/players:
 *   get:
 *     summary: 플레이어 목록 조회
 *     description: 전체 플레이어 목록을 가입일 기준 최신순으로 반환
 *     tags: [Players]
 *     responses:
 *       200:
 *         description: 플레이어 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Player'
 */
router.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const players = await playerService.findAll();
    res.json(players);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/players/{id}:
 *   get:
 *     summary: 플레이어 단건 조회
 *     description: ID로 특정 플레이어 정보를 조회
 *     tags: [Players]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 플레이어 UUID
 *     responses:
 *       200:
 *         description: 플레이어 정보
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Player'
 *       404:
 *         description: 플레이어를 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const player = await playerService.findById(req.params.id as string);
    res.json(player);
  } catch (err) {
    next(err);
  }
});

export default router;
