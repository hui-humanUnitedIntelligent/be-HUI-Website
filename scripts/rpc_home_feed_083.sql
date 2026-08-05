-- Sprint 2: Desktop Home Feed RPC (Migration 083)
-- Source: be-hui supabase/migrations/20260805_083_rpc_home_feed.sql

BEGIN;

CREATE OR REPLACE FUNCTION public.rpc_home_feed(
  p_limit     int  DEFAULT 10,
  p_inv_limit int  DEFAULT 2,
  p_phase     text DEFAULT 'full'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_works   jsonb;
  v_beitr   jsonb;
  v_exps    jsonb;
  v_invs    jsonb;
  v_talents jsonb;
  v_impacts jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(to_jsonb(w)), '[]'::jsonb) INTO v_works
  FROM (
    SELECT id, title, cover_url, media_url, category, description, caption, tags,
           price, for_sale, status, approval_status, user_id, creator_id, created_at
    FROM works
    WHERE status = 'published' AND approval_status = 'approved'
    ORDER BY created_at DESC
    LIMIT p_limit
  ) w;

  SELECT COALESCE(jsonb_agg(to_jsonb(b)), '[]'::jsonb) INTO v_beitr
  FROM (
    SELECT id, user_id, src, type, moment_source, caption, created_at
    FROM beitraege
    ORDER BY created_at DESC
    LIMIT p_limit
  ) b;

  IF p_phase = 'critical' THEN
    RETURN jsonb_build_object(
      'works',     v_works,
      'beitraege', v_beitr
    );
  END IF;

  IF p_phase = 'secondary' THEN
    SELECT COALESCE(jsonb_agg(to_jsonb(e)), '[]'::jsonb) INTO v_exps
    FROM (
      SELECT id, title, cover_url, media_url, category, description, price, duration,
             format, location_text, date, time_start, status, approval_status,
             user_id, created_at, tags
      FROM experiences
      WHERE status = 'published' AND approval_status = 'approved'
      ORDER BY created_at DESC
      LIMIT p_limit
    ) e;

    SELECT COALESCE(jsonb_agg(to_jsonb(i)), '[]'::jsonb) INTO v_invs
    FROM (
      SELECT id, user_id, text, title, vibe, mood, energy, location, city,
             time_label, starts_at, expires_at, visibility, status,
             max_participants, content_type, created_at
      FROM invitations
      WHERE status = 'active' AND visibility = 'public'
        AND expires_at > now()
      ORDER BY created_at DESC
      LIMIT p_inv_limit
    ) i;

    RETURN jsonb_build_object(
      'experiences', v_exps,
      'invitations', v_invs
    );
  END IF;

  IF p_phase = 'tertiary' THEN
    SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) INTO v_talents
    FROM (
      SELECT id, user_id, title, description, category, images,
             price_per_hour, price_per_session, currency, location_type,
             location_address, lat, lng, created_at
      FROM talents
      WHERE status = 'approved'
      ORDER BY created_at DESC
      LIMIT p_limit
    ) t;

    SELECT COALESCE(jsonb_agg(to_jsonb(ia)), '[]'::jsonb) INTO v_impacts
    FROM (
      SELECT id, user_id, project_name, short_desc, cover_url,
             funding_goal, current_amount_eur, created_at
      FROM impact_applications
      WHERE status = 'approved'
      ORDER BY created_at DESC
      LIMIT p_limit
    ) ia;

    RETURN jsonb_build_object(
      'talents',             v_talents,
      'impact_applications', v_impacts
    );
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(e)), '[]'::jsonb) INTO v_exps
  FROM (
    SELECT id, title, cover_url, media_url, category, description, price, duration,
           format, location_text, date, time_start, status, approval_status,
           user_id, created_at, tags
    FROM experiences
    WHERE status = 'published' AND approval_status = 'approved'
    ORDER BY created_at DESC
    LIMIT p_limit
  ) e;

  SELECT COALESCE(jsonb_agg(to_jsonb(i)), '[]'::jsonb) INTO v_invs
  FROM (
    SELECT id, user_id, text, title, vibe, mood, energy, location, city,
           time_label, starts_at, expires_at, visibility, status,
           max_participants, content_type, created_at
    FROM invitations
    WHERE status = 'active' AND visibility = 'public'
      AND expires_at > now()
    ORDER BY created_at DESC
    LIMIT p_inv_limit
  ) i;

  SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) INTO v_talents
  FROM (
    SELECT id, user_id, title, description, category, images,
           price_per_hour, price_per_session, currency, location_type,
           location_address, lat, lng, created_at
    FROM talents
    WHERE status = 'approved'
    ORDER BY created_at DESC
    LIMIT p_limit
  ) t;

  SELECT COALESCE(jsonb_agg(to_jsonb(ia)), '[]'::jsonb) INTO v_impacts
  FROM (
    SELECT id, user_id, project_name, short_desc, cover_url,
           funding_goal, current_amount_eur, created_at
    FROM impact_applications
    WHERE status = 'approved'
    ORDER BY created_at DESC
    LIMIT p_limit
  ) ia;

  RETURN jsonb_build_object(
    'works',               v_works,
    'beitraege',           v_beitr,
    'experiences',         v_exps,
    'invitations',         v_invs,
    'talents',             v_talents,
    'impact_applications', v_impacts
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_home_feed(int, int, text) TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.rpc_feed_card_meta(
  p_items   jsonb,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post_ids    uuid[];
  v_moment_ids  uuid[];
  v_reactions   jsonb := '{}'::jsonb;
  v_my_types    jsonb := '{}'::jsonb;
  v_comments    jsonb := '{}'::jsonb;
  v_reported    jsonb := '[]'::jsonb;
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RETURN jsonb_build_object(
      'reactions', v_reactions,
      'my_types', v_my_types,
      'comment_counts', v_comments,
      'reported_moments', v_reported
    );
  END IF;

  SELECT array_agg(DISTINCT (e->>'post_id')::uuid)
  INTO v_post_ids
  FROM jsonb_array_elements(p_items) e
  WHERE (e->>'post_id') IS NOT NULL;

  SELECT array_agg(DISTINCT (e->>'moment_id')::uuid)
  INTO v_moment_ids
  FROM jsonb_array_elements(p_items) e
  WHERE (e->>'moment_id') IS NOT NULL;

  IF v_post_ids IS NOT NULL AND cardinality(v_post_ids) > 0 THEN
    SELECT COALESCE(
      jsonb_object_agg(
        pid::text,
        jsonb_build_object(
          'like',    cnt_like,
          'inspire', cnt_inspire,
          'save',    cnt_save,
          'share',   cnt_share,
          'total',   cnt_total
        )
      ),
      '{}'::jsonb
    )
    INTO v_reactions
    FROM (
      SELECT post_id AS pid,
        COUNT(*) FILTER (WHERE type = 'like')    AS cnt_like,
        COUNT(*) FILTER (WHERE type = 'inspire') AS cnt_inspire,
        COUNT(*) FILTER (WHERE type = 'save')    AS cnt_save,
        COUNT(*) FILTER (WHERE type = 'share')   AS cnt_share,
        COUNT(*)                    AS cnt_total
      FROM post_reactions
      WHERE post_id = ANY(v_post_ids)
      GROUP BY post_id
    ) r;

    IF p_user_id IS NOT NULL THEN
      SELECT COALESCE(
        jsonb_object_agg(post_id::text, types),
        '{}'::jsonb
      )
      INTO v_my_types
      FROM (
        SELECT post_id, jsonb_agg(DISTINCT type) AS types
        FROM post_reactions
        WHERE post_id = ANY(v_post_ids) AND user_id = p_user_id
        GROUP BY post_id
      ) mt;
    END IF;

    SELECT COALESCE(jsonb_object_agg(meta_key, cnt), '{}'::jsonb)
    INTO v_comments
    FROM (
      SELECT
        (e->>'post_id')::text || ':' || (e->>'post_type') AS meta_key,
        COUNT(pc.id) AS cnt
      FROM jsonb_array_elements(p_items) e
      INNER JOIN post_comments pc
        ON pc.post_id = (e->>'post_id')::uuid
        AND pc.post_type = e->>'post_type'
        AND pc.parent_comment_id IS NULL
        AND pc.deleted_at IS NULL
      WHERE (e->>'post_id') IS NOT NULL AND (e->>'post_type') IS NOT NULL
      GROUP BY e->>'post_id', e->>'post_type'
    ) cc;
  END IF;

  IF p_user_id IS NOT NULL
     AND v_moment_ids IS NOT NULL
     AND cardinality(v_moment_ids) > 0 THEN
    SELECT COALESCE(jsonb_agg(moment_id::text), '[]'::jsonb)
    INTO v_reported
    FROM momente_reports
    WHERE reporter_id = p_user_id AND moment_id = ANY(v_moment_ids);
  END IF;

  RETURN jsonb_build_object(
    'reactions',        v_reactions,
    'my_types',         v_my_types,
    'comment_counts',   v_comments,
    'reported_moments', v_reported
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_feed_card_meta(jsonb, uuid) TO authenticated, anon;

COMMIT;
