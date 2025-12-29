import { useMemo, useState, useRef, useEffect } from "react";
import { displayName } from "../../../utils/people";
import "./ReadReceiptBadge.scss";

const DEBUG_RRB = false;

/**
 * Props:
 * - canal_id: number
 * - msg_id: number
 * - msg_ts: number (Date.getTime() del mensaje)
 * - my_user_id: number
 * - members: array [{
 *     user_id, last_read_msg_id?, last_read_at?,
 *     user?: { id, email, feder?: { nombre, apellido, avatar_url? } },
 *     feder?: { nombre, apellido, avatar_url? }
 *   }]
 * - align: 'left' | 'right'
 */
export default function ReadReceiptBadge({
  canal_id,
  msg_id,
  msg_ts,
  my_user_id,
  members = [],
  align = "right",
}) {
  if (DEBUG_RRB) {
    // eslint-disable-next-line no-console
    console.debug("RRB props →", {
      canal_id,
      msg_id,
      msg_ts,
      my_user_id,
      members,
    });
  }

  const { isDM, totalOtros, vistos, noVistos } = useMemo(() => {
    const otros = (members || []).filter(
      (m) => Number(m?.user_id) !== Number(my_user_id)
    );
    const total = otros.length;

    const v = [];
    const nv = [];
    for (const m of otros) {
      const lrmid = Number(m?.last_read_msg_id || 0);
      const lrat = m?.last_read_at ? new Date(m.last_read_at).getTime() : 0;
      const seenById = lrmid > 0 && lrmid >= Number(msg_id);
      const seenByTs = lrat > 0 && (msg_ts ? lrat >= Number(msg_ts) : false);
      const seen = seenById || seenByTs;
      if (seen) v.push(m);
      else nv.push(m);
    }
    // ordená los vistos por hora (más viejo → más nuevo), luego por nombre
    const byTime = (a, b) =>
      new Date(a?.last_read_at || 0) - new Date(b?.last_read_at || 0);
    const byName = (a, b) =>
      (displayName(a) || "").localeCompare(displayName(b) || "");
    v.sort((a, b) => byTime(a, b) || byName(a, b));
    nv.sort(byName);

    return { isDM: total === 1, totalOtros: total, vistos: v, noVistos: nv };
  }, [members, my_user_id, msg_id, msg_ts]);

  const hayDatos = [...vistos, ...noVistos].some(
    (m) => (m?.last_read_msg_id | 0) > 0 || !!m?.last_read_at
  );
  if (!members?.length || !hayDatos) return null;

  // DM → mostrar “Visto HH:MM” cuando el otro lo leyó
  if (isDM) {
    if (vistos.length === 1) {
      const at = timeHM(vistos[0]?.last_read_at);
      return (
        <div
          className={`rrb rrb-dm ${align === "left" ? "left" : "right"}`}
          title={at ? `Visto ${at}` : "Visto"}
        >
          <i className="ticks ticks-all" aria-hidden>
            ✓✓
          </i>
          <span className="txt">Visto{at ? ` ${at}` : ""}</span>
        </div>
      );
    }
    return null;
  }

  // Grupo/canal (>2)
  const allSeen = totalOtros > 0 && vistos.length === totalOtros;
  return (
    <ReceiptGroupBadge
      align={align}
      allSeen={allSeen}
      vistos={vistos}
      noVistos={noVistos}
      total={totalOtros}
    />
  );
}

function ReceiptGroupBadge({ align, allSeen, vistos, noVistos, total }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const countTxt = `${vistos.length}/${total}`;

  useEffect(() => {
    if (!open) return;
    const onDown = (ev) => {
      if (rootRef.current && !rootRef.current.contains(ev.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={`rrb rrb-group ${align === "left" ? "left" : "right"} ${open ? "open" : ""}`}
    >
      <button
        className={`chip ${allSeen ? "all" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        title={allSeen ? "Visto por todos" : "Ver quiénes ya lo vieron"}
        type="button"
      >
        <i
          className={`ticks ${allSeen ? "ticks-all" : "ticks-part"}`}
          aria-hidden
        >
          ✓✓
        </i>
        {!allSeen && <span className="count">{countTxt}</span>}
        {allSeen && <span className="allTxt">Todos</span>}
      </button>

      {open && (
        <div className="popover" role="dialog" aria-label="Detalles de lectura">
          <section style={{ backgroundColor: "white" }}>
            <header>Vieron ({vistos.length})</header>
            {vistos.length ? (
              <ul className="list">
                {vistos.map((u) => (
                  <li className="row" key={u.user_id}>
                    <span className="name">
                      {displayName(u) || `Usuario ${u.user_id}`}
                    </span>
                    <time className="time" dateTime={u?.last_read_at || ""}>
                      {timeHM(u?.last_read_at)}
                    </time>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="muted">Nadie aún</div>
            )}
          </section>
          <section>
            <header>No vieron ({noVistos.length})</header>
            {noVistos.length ? (
              <ul className="list">
                {noVistos.map((u) => (
                  <li className="row" key={u.user_id}>
                    <span className="name">
                      {displayName(u) || `Usuario ${u.user_id}`}
                    </span>
                    <span className="time muted">—</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="muted">—</div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function timeHM(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}
