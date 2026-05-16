<<<<<<< HEAD
import { Hono } from 'hono'

const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

export default app
=======
import { instrument } from "@fiberplane/hono-otel";
import { Hono } from "hono";

import api from "./api";
import type { HonoEnv } from "./types";

const app = new Hono<HonoEnv>();

app.route("/api", api);

export default instrument(app);
>>>>>>> dev/webhook
