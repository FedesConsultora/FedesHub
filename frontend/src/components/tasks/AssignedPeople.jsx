
// import Avatar from '../Avatar.jsx'
// import './assigned-people.scss'

// export default function AssignedPeople({ responsables=[], colaboradores=[] }){
//   return (
//     <div className="peopleGrid">
//        <Group
        
//         title="Colaboradores"
//         items={colaboradores}
//         showRole={true}
//       />
//       <Group
       
//         title="Responsable"
//         items={responsables}
//         showRole={false}
//         // renderBadge={(p)=> p.es_lider ? (<><FaCrown className="crown"/><span>Líder</span></>) : null}
//       />
     
//     </div>
//   )
// }

// function Group({ title, icon, items=[], showRole=false, renderBadge }){
//   return (
//     <div className="peopleGroup">
//       <div className="pgHead">
//         <span className="fh-row" style={{gap:8}}>
//           {icon}<span>{title}</span>
//         </span>
       
//       </div>

//       <div className="peopleList">
//         {items.length ? items.map((p, i) => {
//           const fullName = [p.nombre, p.apellido].filter(Boolean).join(' ') || p.name || '—'
//           const badgeEl = renderBadge ? renderBadge(p) : null
//           return (
//             <div className="person" key={p.feder_id || p.id || i}>
//               <Avatar src={p.avatar_url || undefined} name={fullName} size={36} usePlaceholder={false} />
//               <div className="info">
//                 <div className="name">{fullName}</div>
//               </div>
//               {badgeEl && <div className="badge">{badgeEl}</div>}
//             </div>
//           )
//         }) : <div className="empty">Sin {title.toLowerCase()}</div>}
//       </div>
//     </div>
//   )
// }
import { useState } from 'react';
import { MdKeyboardArrowDown } from 'react-icons/md';
import Avatar from '../Avatar.jsx';
import { CiCirclePlus } from "react-icons/ci";

import './assigned-people.scss';

export default function AssignedPeople({
  responsables = [],
  colaboradores = [],
  candidatesResp = [],
  candidatesCol = [],
  onLocalChange
}) {
  const [openIndex, setOpenIndex] = useState(null);
  const [localState, setLocalState] = useState({
    responsables,
    colaboradores
  });

  const toggle = (key, index) => {
    const id = `${key}-${index}`;
    setOpenIndex(openIndex === id ? null : id);
  };

  const handleSelect = (key, index, person) => {
    const updated = {
      ...localState,
      [key]: [...localState[key], person]
    };
    setLocalState(updated);
    onLocalChange?.(updated);
    setOpenIndex(null);
  };

  const Group = ({ title, groupKey, showRole = false, renderBadge, candidates }) => (
    <div className="peopleGroup">
      <div className="pgHead">
        <span className="fh-row" style={{ gap: 8 }}>
          <span>{title}</span>
        </span>
      </div>

      <div className="peopleList">
        {localState[groupKey].length ? localState[groupKey].map((p, i) => {
          const fullName = [p.nombre, p.apellido].filter(Boolean).join(' ') || p.name || '—';
          const badgeEl = renderBadge ? renderBadge(p) : null;
          const isOpen = openIndex === `${groupKey}-${i}`;
          return (
            <div className="person" key={p.feder_id || p.id || i}>
              <Avatar src={p.avatar_url || undefined} name={fullName} size={36} usePlaceholder={false} />
              <div className="info">
                <div className="name">
                  {fullName}
                  <span className="arrow" onClick={() => toggle(groupKey, i)}><MdKeyboardArrowDown />
</span>
                </div>
              </div>
              {badgeEl && <div className="badge">{badgeEl}</div>}

              {isOpen && (
                <div className="dropdown">
                  {candidates.length ? (
                    <ul>
                      {candidates.map(c => (
                        <li key={c.id} onClick={() => handleSelect(groupKey, i, c)}>
                          {[c.nombre, c.apellido].filter(Boolean).join(' ') || c.name || '—'}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="empty"></div>
                  )}
                </div>
              )}
            </div>
          )
        }) : <div className="empty">Sin {title.toLowerCase()}</div>}
      </div>
    </div>
  );

  return (
    <div className="peopleGrid">
      <Group
        title="Colaboradores"
        groupKey="colaboradores"
        showRole={true}
        candidates={candidatesCol}
      />
      
      <CiCirclePlus size={36} style={{position:'relative', top:' .8rem', right:'1.3rem'}}
     />

      <Group
        title="Responsables"
        groupKey="responsables"
        showRole={false}
        candidates={candidatesResp}
      />
    </div>
  );
}

