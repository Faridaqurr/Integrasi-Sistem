import grpc
from concurrent import futures
import time
import bcrypt

import konser_pb2
import konser_pb2_grpc
from db import users, konser, pemesanan
from pymongo import MongoClient

# Initialize MongoDB client
client = MongoClient("mongodb://localhost:27017/")


class KonserServicer(konser_pb2_grpc.KonserServiceServicer):
    # Unary - Register User
    def RegisterUser(self, request, context):
        if users.find_one({"username": request.username}):
            return konser_pb2.RegisterResponse(sukses=False, pesan="Username sudah digunakan")

        hashed = bcrypt.hashpw(request.password.encode('utf-8'), bcrypt.gensalt())
        users.insert_one({"username": request.username, "password": hashed})
        return konser_pb2.RegisterResponse(sukses=True, pesan="Registrasi berhasil, silakan login")

    # Unary - Login User
    def LoginUser(self, request, context):
        user = users.find_one({"username": request.username})
        if user and bcrypt.checkpw(request.password.encode('utf-8'), user['password']):
            return konser_pb2.LoginResponse(sukses=True, pesan="Login berhasil")
        else:
            return konser_pb2.LoginResponse(sukses=False, pesan="Login gagal")

    # Unary - Add Concert
    def TambahKonser(self, request, context):
        if konser.find_one({"nama": request.nama}):
            return konser_pb2.Status(pesan="Konser dengan nama tersebut sudah ada!")

        # Menambahkan konser ke database dengan jumlah_tiket yang dikirimkan dari client
        konser.insert_one({
            "nama": request.nama,
            "lokasi": request.lokasi,
            "tanggal": request.tanggal,
            "jumlah_tiket": request.jumlah_tiket  # Menyimpan jumlah tiket yang dimasukkan client
        })
        return konser_pb2.Status(pesan=f"Konser '{request.nama}' berhasil ditambahkan dengan {request.jumlah_tiket} tiket!")

    # Server Streaming - View All Concerts
    def LihatSemuaKonser(self, request, context):
        for k in konser.find():
            yield konser_pb2.Konser(
                nama=k["nama"],
                lokasi=k["lokasi"],
                tanggal=k["tanggal"],
                jumlah_tiket=k.get("jumlah_tiket", 0)  # ✅ tambahkan ini
            )

    # Unary - Edit Concert
    def EditKonser(self, request, context):
        result = konser.update_one({"nama": request.nama}, {
            "$set": {
                "lokasi": request.lokasi,
                "tanggal": request.tanggal
            }
        })
        return konser_pb2.Status(pesan="Konser berhasil diperbarui" if result.modified_count else "Konser tidak ditemukan")

    # Unary - Hapus Konser
    def HapusKonser(self, request, context):
        konser_nama = request.nama
        if pemesanan.find_one({"konser_nama": konser_nama}):
            return konser_pb2.Status(pesan="Tidak bisa menghapus konser, tiket sudah terjual.")

        result = konser.delete_one({"nama": konser_nama})
        if result.deleted_count:
            return konser_pb2.Status(pesan="Konser dihapus")
        else:
            return konser_pb2.Status(pesan="Konser tidak ditemukan")

    # Unary - Order Ticket
    def PesanTiket(self, request, context):
        konser_data = konser.find_one({"nama": request.konser_nama})
        if not konser_data:
            return konser_pb2.TiketResponse(pesan="Konser tidak ditemukan", total=0)

        if konser_data.get("jumlah_tiket", 0) < request.jumlah:
            return konser_pb2.TiketResponse(pesan="Tiket tidak cukup", total=0)

        total = request.jumlah * 150000
        konser.update_one(
            {"nama": request.konser_nama},
            {"$inc": {"jumlah_tiket": -request.jumlah}}
        )
        pemesanan.insert_one({
            "konser_nama": request.konser_nama,
            "jumlah": request.jumlah,
            "total": total
        })
        return konser_pb2.TiketResponse(pesan=f"Tiket berhasil dipesan untuk {request.konser_nama}", total=total)

    # Client Streaming - Order Multiple Tickets
    def PesanBanyak(self, request_iterator, context):
        try:
            berhasil = 0
            gagal = 0
            for request in request_iterator:
                konser_data = konser.find_one({"nama": request.konser_nama})
                if konser_data and konser_data["jumlah_tiket"] >= request.jumlah:
                    konser.update_one(
                        {"_id": konser_data["_id"]},
                        {"$inc": {"jumlah_tiket": -request.jumlah}}
                    )
                    berhasil += 1
                else:
                    gagal += 1

            if berhasil == 0 and gagal == 0:
                return konser_pb2.GeneralResponse(
                    status="400",
                    pesan="Tidak ada tiket yang diproses."
                )

            return konser_pb2.GeneralResponse(
                status="200",
                pesan=f"Berhasil: {berhasil}, Gagal: {gagal}"
            )

        except Exception as e:
            print("ERROR SERVER:", e)
            return konser_pb2.GeneralResponse(
                status="500",
                pesan="Terjadi kesalahan dalam pemesanan tiket."
            )

    # Bi-Directional Streaming - Live Chat
    def LiveChat(self, request_iterator, context):
        for msg in request_iterator:
            yield konser_pb2.ChatMessage(user="Server", pesan=f"Halo {msg.user}, kamu bilang: {msg.pesan}")

def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    konser_pb2_grpc.add_KonserServiceServicer_to_server(KonserServicer(), server)
    server.add_insecure_port('[::]:50051')
    server.start()
    print("gRPC server jalan di port 50051...")
    server.wait_for_termination()


if __name__ == '__main__':
    serve()