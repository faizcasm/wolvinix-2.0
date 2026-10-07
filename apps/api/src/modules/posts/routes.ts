import { Router } from "express";
import { asyncHandler } from "../../lib/errors.js";
import { protect } from "../../middleware/protect.js";
import { validate } from "../../middleware/validate.js";
import {
  addReply,
  bookmarks,
  byHashtag,
  createPost,
  deletePost,
  deleteReply,
  explore,
  feed,
  getPost,
  postsByUser,
  postsTaggedIn,
  toggleBookmark,
  toggleLike,
  trendingHashtags,
  updatePost,
  updateReply,
} from "./controller.js";
import {
  createPostSchema,
  hashtagParams,
  listQuery,
  postParams,
  replyParams,
  replySchema,
  updatePostSchema,
  usernameParams,
} from "./schemas.js";

export const postsRouter = Router();

postsRouter.use(protect);

// --- feeds (static paths before `/:id`) --------------------------------
postsRouter.get("/feed", validate({ query: listQuery }), asyncHandler(feed));
postsRouter.get("/explore", validate({ query: listQuery }), asyncHandler(explore));
postsRouter.get("/bookmarks", validate({ query: listQuery }), asyncHandler(bookmarks));
postsRouter.get("/hashtags", validate({ query: listQuery }), asyncHandler(trendingHashtags));
postsRouter.get(
  "/hashtags/:tag",
  validate({ params: hashtagParams, query: listQuery }),
  asyncHandler(byHashtag),
);
postsRouter.get(
  "/user/:username",
  validate({ params: usernameParams, query: listQuery }),
  asyncHandler(postsByUser),
);
postsRouter.get(
  "/tagged/:username",
  validate({ params: usernameParams, query: listQuery }),
  asyncHandler(postsTaggedIn),
);

// --- posts --------------------------------------------------------------
postsRouter.post("/", validate({ body: createPostSchema }), asyncHandler(createPost));
postsRouter.get("/:id", validate({ params: postParams }), asyncHandler(getPost));
postsRouter.patch(
  "/:id",
  validate({ params: postParams, body: updatePostSchema }),
  asyncHandler(updatePost),
);
postsRouter.delete("/:id", validate({ params: postParams }), asyncHandler(deletePost));
postsRouter.put("/:id/like", validate({ params: postParams }), asyncHandler(toggleLike));
postsRouter.post("/:id/bookmark", validate({ params: postParams }), asyncHandler(toggleBookmark));

// --- replies ------------------------------------------------------------
postsRouter.post(
  "/:id/replies",
  validate({ params: postParams, body: replySchema }),
  asyncHandler(addReply),
);
postsRouter.patch(
  "/:id/replies/:replyId",
  validate({ params: replyParams, body: replySchema }),
  asyncHandler(updateReply),
);
postsRouter.delete(
  "/:id/replies/:replyId",
  validate({ params: replyParams }),
  asyncHandler(deleteReply),
);
