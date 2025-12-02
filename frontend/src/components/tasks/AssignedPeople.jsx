import { useState, useRef,useEffect } from 'react';
import Avatar from '../Avatar.jsx';
import { MdClose } from 'react-icons/md';
import { CiCirclePlus} from "react-icons/ci";
import { MdEdit } from "react-icons/md";

import './assigned-people.scss';

export default function AssignedPeople({
  responsables = [],
  colaboradores = [],
  candidatesResp = [],
  candidatesCol = [],
  onChange
}) {
  const [openAdd, setOpenAdd] = useState(null);
const dropdownRef = useRef(null);

// Cierra el dropdown al clickear fuera
 useEffect(() => {
    const handleClickOutside = (e) => {
      // si hay dropdown abierto y el click NO está dentro de él
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenAdd(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  /** Notifica cambios al componente padre */
  const update = (nextState) => {
    onChange?.(nextState);
  };

  /** Agregar persona */
const handleAdd = (groupKey, person) => {
  if (groupKey === "responsables") {
    update({
      responsables: [person],
      colaboradores
    });
  } else {
    update({
      responsables,
      colaboradores: [...colaboradores, person]
    });
  }
  setOpenAdd(null);
};


  /** Eliminar persona */
 const handleRemove = (groupKey, index) => {
  const list = groupKey === 'responsables' ? [...responsables] : [...colaboradores];
  const removed = list.splice(index, 1); // lo quitamos

  const nextState = {
    responsables: groupKey === 'responsables' ? list : responsables,
    colaboradores: groupKey === 'colaboradores' ? list : colaboradores
  };

  update(nextState); // llama a onChange
};


  const Group = ({ title, groupKey, items, candidates }) => (
    <div className="peopleGroup">
      <div className="pgHead">
        <span>{title}</span>

        {/* Wrapper para posicionar dropdown */}
        <div className="addWrapper"  ref={dropdownRef}>
         {groupKey === "responsables" ? (
  <MdEdit
    size={16}
  style={{cursor: 'pointer'}}
    className="addBtn"
    onClick={() => setOpenAdd(openAdd === groupKey ? null : groupKey)}
  />
) : (
  <CiCirclePlus
                size={26}
                style={{cursor: 'pointer', position:'relative', top: '.2rem'}}
    className="addBtn"
    onClick={() => setOpenAdd(openAdd === groupKey ? null : groupKey)}
  />
)}


    {openAdd === groupKey && (
  <div className="dropdown global dd-add" onClick={(e) => e.stopPropagation()}>
    {candidates.length ? (
      candidates.map((c) => {
        const fullName =
          [c.nombre, c.apellido].filter(Boolean).join(" ") || c.name || '—';

        // helper robusto para comparar personas
        const same = (a, b) => {
          if (!a || !b) return false;
          const aid = a.id ?? a.feder_id ?? null;
          const bid = b.id ?? b.feder_id ?? null;
          if (aid != null && bid != null) return String(aid) === String(bid);
          // fallback por correo o nombre (opcional)
          if (a.email && b.email) return a.email === b.email;
          return false;
        };

        // buscar índice real en items
        const selectedIndex = items.findIndex((p) => same(p, c));
        const isSelected = selectedIndex !== -1;

        return (
          <div key={c.id ?? c.feder_id ?? `${groupKey}-${c.nombre}-${c.apellido}`} className="dd-item">
            {/* Nombre: clic para agregar SOLO si NO está seleccionado */}
            <span
              className="dd-name"
              onClick={() => {
                if (!isSelected) handleAdd(groupKey, c);
              }}
              style={{
                opacity: isSelected ? 0.6 : 1,
                cursor: isSelected ? 'default' : 'pointer'
              }}
            >
              {fullName}
            </span>

            {/* Si está seleccionado → mostrar X para remover */}
            {isSelected && (
              <MdClose
                size={18}
                className="dd-remove"
                onClick={() => handleRemove(groupKey, selectedIndex)}
              />
            )}
          </div>
        );
      })
    ) : (
      <div className="empty">No hay opciones</div>
    )}
  </div>
)}




        </div>
      </div>

      {/* Lista */}
      <div className="peopleList">
        {items.length ? (
          items.map((p, i) => {
            const fullName =
              [p.nombre, p.apellido].filter(Boolean).join(' ') ||
              p.name ||
              '—';

            return (
             <div className="person" key={p.id || p.feder_id || i}>
  <div className="avatarWrapper">
    <Avatar src={p.avatar_url} name={fullName} size={36} />

    {/* Tooltip con el nombre */}
    <div className="avatarTooltip">
      {fullName}
    </div>
  </div>

  

  {/* <MdClose
    size={20}
    className="removeBtn"
    onClick={() => handleRemove(groupKey, i)}
  /> */}
</div>

            );
          })
        ) : (
          <div className="empty">Sin {title.toLowerCase()}</div>
        )}
      </div>
    </div>
  );

  return (
    <div className="peopleGrid">
      <Group
        title="Colaboradores"
        groupKey="colaboradores"
        items={colaboradores}
        candidates={candidatesCol}
      />

      <Group
        title="Responsables"
        groupKey="responsables"
        items={responsables}
        candidates={candidatesResp}
      />
    </div>
  );
}
