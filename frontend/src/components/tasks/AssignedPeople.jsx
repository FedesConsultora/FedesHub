import { useState, useRef, useEffect, useMemo } from 'react';
import Avatar from '../Avatar.jsx';
import { pickAvatar } from '../../utils/people.js';
import AttendanceBadge from '../common/AttendanceBadge.jsx';
import useAttendanceStatus, { getStatus } from '../../hooks/useAttendanceStatus.js';
import { MdClose } from 'react-icons/md';
import { CiCirclePlus } from "react-icons/ci";
import { MdEdit } from "react-icons/md";

import './assigned-people.scss';

const Group = ({ title, groupKey, items, candidates, openAdd, setOpenAdd, handleAdd, handleRemove, disabled, statuses }) => (
  <div className="peopleGroup">
    <div className="pgHead">
      <span>{title}</span>

      {/* Solo mostrar botón de editar/agregar si NO está disabled */}
      {!disabled && (
        <div className="addWrapper">
          {groupKey === "responsables" ? (
            <MdEdit
              size={16}
              style={{ cursor: 'pointer' }}
              className="addBtn"
              onClick={(e) => {
                e.stopPropagation();
                setOpenAdd(openAdd === groupKey ? null : groupKey);
              }}
            />
          ) : (
            <CiCirclePlus
              size={26}
              style={{ cursor: 'pointer', position: 'relative', top: '.2rem' }}
              className="addBtn"
              onClick={(e) => {
                e.stopPropagation();
                setOpenAdd(openAdd === groupKey ? null : groupKey);
              }}
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
      )}
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
                <Avatar
                  src={pickAvatar(p)}
                  name={fullName}
                  size={36}
                  federId={p.feder_id || p.id}
                />
                <AttendanceBadge {...getStatus(statuses, p.feder_id || p.id)} size={14} />

                {/* Tooltip con el nombre */}
                <div className="avatarTooltip">
                  {fullName}
                </div>
              </div>
            </div>

          );
        })
      ) : (
        <div className="empty">Sin {title.toLowerCase()}</div>
      )}
    </div>
  </div>
);

export default function AssignedPeople({
  responsables = [],
  colaboradores = [],
  candidatesResp = [],
  candidatesCol = [],
  onChange,
  disabled = false
}) {
  const [openAdd, setOpenAdd] = useState(null);

  // Get all feder IDs for attendance status
  const allFederIds = useMemo(() => {
    const ids = [];
    for (const p of [...responsables, ...colaboradores]) {
      const id = p.feder_id || p.id;
      if (id) ids.push(id);
    }
    return ids;
  }, [responsables, colaboradores]);

  console.log('[AssignedPeople] federIds:', allFederIds)
  const { statuses } = useAttendanceStatus(allFederIds);
  console.log('[AssignedPeople] statuses:', statuses)

  // Click outside para cerrar dropdown - Solución definitiva
  useEffect(() => {
    if (!openAdd) return; // Solo activar si hay algo abierto

    const handleClickOutside = (e) => {
      // Verificar si el click fue FUERA del wrapper y dropdown
      const clickedElement = e.target;
      const isInsideWrapper = clickedElement.closest('.addWrapper');
      const isInsideDropdown = clickedElement.closest('.dd-add');

      if (!isInsideWrapper && !isInsideDropdown) {
        setOpenAdd(null);
      }
    };

    // Usar mousedown en lugar de click para capturar antes
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openAdd]);

  /** Notifica cambios al componente padre */
  const update = (nextState) => {
    onChange?.(nextState);
  };

  /** Agregar persona */
  const handleAdd = (groupKey, person) => {
    if (groupKey === "responsables") {
      update({
        responsables: [person], // Reemplaza al anterior (solo 1 responsable)
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

  return (
    <div className="peopleGrid">
      <Group
        title="Colaboradores"
        groupKey="colaboradores"
        items={colaboradores}
        candidates={candidatesCol}
        openAdd={openAdd}
        setOpenAdd={setOpenAdd}
        handleAdd={handleAdd}
        handleRemove={handleRemove}
        disabled={disabled}
        statuses={statuses}
      />

      <Group
        title="Responsables"
        groupKey="responsables"
        items={responsables}
        candidates={candidatesResp}
        openAdd={openAdd}
        setOpenAdd={setOpenAdd}
        handleAdd={handleAdd}
        handleRemove={handleRemove}
        disabled={disabled}
        statuses={statuses}
      />
    </div>
  );
}
